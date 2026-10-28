// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Project, Node, CallExpression, ts, CompilerOptions } from "ts-morph";
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { makeExclusionsRelativeToSource } from "./operations";
import { findFilesWithRipgrep } from './ripgrep';
import { ClassificationResolver, isMeasurement, isUnresolved } from './classification-resolver';
import { Dictionary, isDictionary } from './object-utils';

const sourceFilesPerBatch = 64;
const telemetryFunctions = ['publicLog2', 'publicLogError2'];
// The extension host calls the main thread's telemetry service through an RPC proxy
const telemetryCallNamesInAnyFile = [...telemetryFunctions, ...telemetryFunctions.map(name => `$${name}`)];

interface TelemetryCall {
    start: number;
    width: number;
}

interface TelemetryCalls {
    filePath: string;
    calls: TelemetryCall[];
}

/** The classification resolved from a single `publicLog2` or `publicLogError2` call. */
export interface TsEventDeclaration {
    name: string;
    location: string;
    properties: Dictionary;
}

export type ParserWorkerRequest = {
    kind: 'prepare';
    sourceFiles: string[];
    compilerOptions: CompilerOptions;
} | {
    kind: 'parse';
    calls: TelemetryCalls[];
    sharedSourceFiles: string[];
    compilerOptions: CompilerOptions;
    applyEndpoints: boolean;
    lowerCaseEvents: boolean;
};

export type ParserWorkerResult = {
    kind: 'prepared';
    calls: TelemetryCalls[];
    sharedSourceFiles: string[];
} | {
    kind: 'parsed';
    declarations: TsEventDeclaration[];
    errors: string[];
};

export function runParserWorker(request: ParserWorkerRequest): Promise<ParserWorkerResult> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'ts-parser-worker.js'), { workerData: request });
        let result: ParserWorkerResult | undefined;
        let error: Error | undefined;
        worker.once('message', (message: ParserWorkerResult) => {
            result = message;
        });
        worker.once('error', workerError => {
            error = workerError;
        });
        // Do not start another compiler until this worker has released its heap.
        worker.once('exit', code => {
            if (error) {
                reject(error);
            } else if (code !== 0) {
                reject(new Error(`Telemetry parser worker exited with code ${code}`));
            } else if (!result) {
                reject(new Error('Telemetry parser worker exited without a result'));
            } else {
                resolve(result);
            }
        });
    });
}

export function createProject(sourceDir: string): Project {
    // A TS config allows the language service to resolve the repository's imports
    for (const tsConfigFilePath of [path.join(sourceDir, 'src/tsconfig.json'), path.join(sourceDir, 'tsconfig.json')]) {
        if (fs.existsSync(tsConfigFilePath)) {
            return new Project({ tsConfigFilePath, skipAddingFilesFromTsConfig: true });
        }
    }
    return new Project({});
}

/** The names a source file calls the telemetry functions by, including renamed imports. */
function telemetryCallNames(sourceFile: ts.SourceFile): Set<string> {
    const names = new Set(telemetryCallNamesInAnyFile);
    for (const statement of sourceFile.statements) {
        const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
        if (bindings && ts.isNamedImports(bindings)) {
            for (const element of bindings.elements) {
                if (element.propertyName && telemetryFunctions.includes(element.propertyName.text)) {
                    names.add(element.name.text);
                }
            }
        }
    }
    return names;
}

/** The name of the called function or method, such as `publicLog2` for `this.telemetryService.publicLog2(...)`. */
function calledName(expression: ts.Expression): string | undefined {
    if (ts.isIdentifier(expression)) {
        return expression.text;
    }
    if (ts.isPropertyAccessExpression(expression)) {
        return expression.name.text;
    }
    if (ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression)) {
        return expression.argumentExpression.text;
    }
    return undefined;
}

/** Extracts `publicLog2` and `publicLogError2` classifications from a source directory. */
export class TsParser {
    private readonly project: Project;
    private readonly sourceFiles: string[];
    /** Classifications which could not be resolved, reported by `parseFiles`. */
    public readonly errors: string[] = [];

    constructor(sourceDir: string, excludedDirs: string[], private readonly applyEndpoints: boolean, private readonly lowerCaseEvents: boolean) {
        this.project = createProject(sourceDir);
        const exclusions = makeExclusionsRelativeToSource(sourceDir, excludedDirs).flatMap(dir => ['--glob', `!${dir}/**`]);
        // Exclusions are added last because the last matching glob takes effect
        this.sourceFiles = findFilesWithRipgrep(sourceDir, ['--glob', '**/*.ts', ...exclusions, '--no-ignore', '--regexp', 'publicLog2|publicLogError2']);
    }

    public async parseFiles(): Promise<TsEventDeclaration[]> {
        if (this.sourceFiles.length <= sourceFilesPerBatch) {
            for (const file of this.sourceFiles) {
                this.project.addSourceFileAtPathIfExists(file);
            }
            const parser = new TsProjectParser(this.project, this.applyEndpoints, this.lowerCaseEvents);
            const declarations = parser.parseFiles();
            this.errors.push(...parser.errors);
            return declarations;
        }

        const compilerOptions = this.project.getCompilerOptions();
        const prepared = await runParserWorker({ kind: 'prepare', sourceFiles: this.sourceFiles, compilerOptions });
        if (prepared.kind !== 'prepared') {
            throw new Error('Telemetry parser worker did not return call locations');
        }

        const declarations: TsEventDeclaration[] = [];
        for (let index = 0; index < prepared.calls.length; index += sourceFilesPerBatch) {
            const parsed = await runParserWorker({
                kind: 'parse',
                calls: prepared.calls.slice(index, index + sourceFilesPerBatch),
                sharedSourceFiles: prepared.sharedSourceFiles,
                compilerOptions,
                applyEndpoints: this.applyEndpoints,
                lowerCaseEvents: this.lowerCaseEvents
            });
            if (parsed.kind !== 'parsed') {
                throw new Error('Telemetry parser worker did not return declarations');
            }
            declarations.push(...parsed.declarations);
            this.errors.push(...parsed.errors);
        }
        return declarations;
    }
}

export class TsProjectParser {
    /** Classifications which could not be resolved, reported by `parseFiles`. */
    public readonly errors: string[] = [];

    constructor(
        private readonly project: Project,
        private readonly applyEndpoints: boolean,
        private readonly lowerCaseEvents: boolean
    ) { }

    private collectCalls(): TelemetryCalls[] {
        const groups: TelemetryCalls[] = [];
        for (const source of this.project.getSourceFiles()) {
            const calls: TelemetryCall[] = [];
            const sourceFile = source.compilerNode;
            const names = telemetryCallNames(sourceFile);
            const visit = (node: ts.Node): void => {
                if (ts.isCallExpression(node) && node.arguments.length > 0) {
                    const name = calledName(node.expression);
                    // Calls which forward an `eventName` parameter are wrappers, not events
                    if (name !== undefined && names.has(name) && node.arguments[0].getText(sourceFile) !== 'eventName') {
                        calls.push({ start: node.getStart(sourceFile), width: node.getWidth(sourceFile) });
                    }
                }
                ts.forEachChild(node, visit);
            };
            ts.forEachChild(sourceFile, visit);
            if (calls.length > 0) {
                groups.push({ filePath: source.getFilePath(), calls });
            }
        }
        return groups.sort((a, b) => a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0);
    }

    private getSharedSourceFiles(): string[] {
        const program = this.project.getProgram().compilerObject;
        return program.getSourceFiles().filter(source =>
            !ts.isExternalModule(source) || source.statements.some(statement =>
                ts.isModuleDeclaration(statement) &&
                (ts.isStringLiteral(statement.name) || (statement.flags & ts.NodeFlags.GlobalAugmentation) !== 0))
        ).map(source => source.fileName);
    }

    public prepare(): ParserWorkerResult {
        const calls = this.collectCalls();
        return {
            kind: 'prepared',
            calls,
            sharedSourceFiles: calls.length > 0 ? this.getSharedSourceFiles() : []
        };
    }

    public parseFiles(calls = this.collectCalls()): TsEventDeclaration[] {
        const declarations: TsEventDeclaration[] = [];
        for (const group of calls) {
            const source = this.project.getSourceFileOrThrow(group.filePath);
            for (const call of group.calls) {
                const node = source.getDescendantAtStartWithWidth(call.start, call.width);
                if (!node || !Node.isCallExpression(node)) {
                    throw new Error(`Could not locate telemetry call in ${group.filePath} at ${call.start}`);
                }
                const declaration = this.parseCall(node);
                if (declaration) {
                    declarations.push(declaration);
                }
            }
        }
        return declarations;
    }

    private parseCall(call: CallExpression): TsEventDeclaration | undefined {
        const [eventArgument] = call.getArguments();
        const typeArguments = call.getTypeArguments();
        const isClassified = typeArguments.length === 2;
        const location = `${call.getSourceFile().getFilePath()}:${call.getStartLineNumber()}`;
        const eventType = eventArgument.getType();
        if (!eventType.isStringLiteral()) {
            // Unclassified calls with a dynamic name are usually wrappers that forward an event name
            if (isClassified) {
                this.errors.push(`Unable to resolve the name of the event classified at ${location}: ${eventArgument.getText()}`);
            }
            return undefined;
        }
        const declaredName = String(eventType.getLiteralValue());
        const name = this.lowerCaseEvents ? declaredName.toLowerCase() : declaredName;
        if (!isClassified) {
            // An event sent without a classification only has common properties
            return { name, location, properties: Object.create(null) };
        }

        const [dataType, classificationType] = typeArguments.map(argument => argument.getType());
        const description = `of event '${declaredName}' at ${location}`;
        for (const [kind, argument, type] of [['data', typeArguments[0], dataType], ['classification', typeArguments[1], classificationType]] as const) {
            if (isUnresolved(type)) {
                this.errors.push(`The ${kind} type ${description} could not be resolved: ${argument.getText()}`);
                return undefined;
            }
        }
        const resolver = new ClassificationResolver(call, this.applyEndpoints, description);
        const properties = resolver.resolve(classificationType);
        this.errors.push(...resolver.errors);

        // Numeric and boolean event data is sent as a measurement
        for (const prop of dataType.getProperties()) {
            const valueDeclaration = prop.getValueDeclaration();
            const property = properties[prop.getName().toLowerCase()];
            if (valueDeclaration && isDictionary(property) && isMeasurement(prop.getTypeAtLocation(valueDeclaration))) {
                property.isMeasurement = true;
            }
        }
        return { name, location, properties };
    }
}
