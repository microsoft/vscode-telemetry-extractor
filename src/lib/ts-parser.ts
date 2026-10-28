// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Project, SyntaxKind, Symbol, Node, CallExpression, Type, ts, CompilerOptions } from "ts-morph";
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { makeExclusionsRelativeToSource } from "./operations";
import { Metadata } from './events';
import { findFilesWithRipgrep } from './ripgrep';
import type { Dictionary } from './object-utils';

const sourceFilesPerBatch = 64;

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

function isMeasurement(type: Type) {
    // Optional data is sent like required data, and strict null checks must not change the result
    const sentType = type.getNonNullableType();
    if (sentType.isNumber() || sentType.isBoolean()) {
        return true;
    }
    return sentType.isEnum() && getEnumType(sentType) === 'number';
}

function getEnumType(type: Type): 'number' | 'string' | 'mixed' | null {
    if (!type.isEnum()) {
        return null;
    }

    const symbol = type.getSymbol();
    if (!symbol) {
        return null;
    }

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
        return null;
    }

    let hasNumber = false;
    let hasString = false;

    // Get the enum declaration to examine its members
    for (const declaration of declarations) {
        if (declaration.getKind() === SyntaxKind.EnumDeclaration) {
            const enumDeclaration = declaration;
            const members = enumDeclaration.getChildrenOfKind(SyntaxKind.EnumMember);

            for (const member of members) {
                const initializer = member.getInitializer();
                if (initializer) {
                    // Has explicit initializer - check its type
                    const initializerType = initializer.getType();
                    if (initializerType.isStringLiteral()) {
                        hasString = true;
                    } else if (initializerType.isNumber()) {
                        hasNumber = true;
                    }
                } else {
                    // No initializer means it's a numeric enum (auto-incremented)
                    hasNumber = true;
                }
            }
            break;
        }
    }

    if (hasNumber && hasString) {
        return 'mixed';
    } else if (hasNumber) {
        return 'number';
    } else if (hasString) {
        return 'string';
    }

    return null;
}


class NodeVisitor {

    private pl_node: Node;
    private prop_name: string;
    private inline: boolean = false;
    private original_prop_name: string;
    private applyEndpoints: boolean;
    public properties: Dictionary[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private resolved_property: any = Object.create(null);
    constructor(callexpress_node: Node, prop_name: string, applyEndpoints: boolean) {
        this.pl_node = callexpress_node;
        this.prop_name = prop_name;
        this.original_prop_name = prop_name;
        this.applyEndpoints = applyEndpoints;
    }

    private visitNode(currentNode: Symbol, previousNode?: Symbol) {
        let type = currentNode.getTypeAtLocation(this.pl_node);
        // If we mark a property as optional then it is nullable, however we want all properties
        // So we want its non nullable type tl;dr this chops off the | undefined
        if (type.isNullable()) {
            type = type.getNonNullableType();
        }
        if (type.isStringLiteral() || type.isBooleanLiteral()) {
            if (previousNode) {
                // This means it is an inline because we had to recurse deeper than the first level to find the properties
                if (this.prop_name !== previousNode.getEscapedName().toLowerCase() && !this.prop_name.includes(`.${previousNode.getEscapedName().toLowerCase()}`)) {
                    this.prop_name = `${this.prop_name}.${previousNode.getEscapedName().toLowerCase()}`;
                    this.inline = true;
                }
            }
            // If we don't want endpoints skip them
            if (currentNode.getEscapedName().toLowerCase() === "endpoint" && !this.applyEndpoints) return;

            const nodeName = currentNode.getEscapedName();
            // If it's a string we strip the quotes
            if (type.isStringLiteral()) {
                this.resolved_property[nodeName] = type.getText().substring(1, type.getText().length - 1);
            } else {
                this.resolved_property[nodeName] = type.getText() === 'true';
            }
            return;
        }
        const nodeName = currentNode.getEscapedName();
        // `column` holds flat table metadata for a property, unless it is itself a classified property
        const isColumnMetadata = nodeName === 'column' && previousNode !== undefined && !type.getProperty('classification');
        if (!isColumnMetadata) {
            const properties = type.getProperties();
            properties.forEach((prop) => {
                this.visitNode(prop, currentNode);
            });
        } else {
            const properties = type.getProperties();
            const value = Object.create(null);
            properties.forEach((prop) => {
                const propType = prop.getTypeAtLocation(this.pl_node);
                if (propType.isStringLiteral()) {
                    value[prop.getEscapedName()] = propType.getText().substring(1, propType.getText().length - 1);
                }
            });
            this.resolved_property['column'] = value;
        }
        // 95% of the time there is only one property in this array but inlines allow
        // for the number of properties found to be unpredictable so we must return an array
        if (this.inline && this.prop_name === this.original_prop_name) {
            // This handles the case where the recursion will cause the inline to be counted one too many times
            return;
        }
        const resolved = Object.create(null);
        if (this.applyEndpoints) {
            this.resolved_property['endPoint'] = this.resolved_property['endPoint'] ? this.resolved_property['endPoint'] : 'none';
        }
        resolved[this.prop_name] = this.resolved_property;
        this.properties.push(resolved);
        this.prop_name = this.original_prop_name;
    }

    private visitMetadataNode(currentNode: Symbol) {
        let type = currentNode.getTypeAtLocation(this.pl_node);
        // If we mark a property as optional then it is nullable, however we want all properties
        // So we want its non nullable type tl;dr this chops off the | undefined
        if (type.isNullable()) {
            type = type.getNonNullableType();
        }
        if (type.isStringLiteral()) {
            const nodeName = currentNode.getEscapedName();
            this.resolved_property[nodeName] = type.getText().substring(1, type.getText().length - 1);
            if (nodeName === 'owner' || nodeName === 'comment' || nodeName === 'expiration') {
                this.properties.push(new Metadata(nodeName, this.resolved_property[nodeName]).simpleObject());
            }
        }
    }

    public resolveProperties(currentNode: Symbol): Dictionary[] {
        // It could be a complex node with nested types or a simple node with a string literal
        // representing some kind of metadata, so we try both visitors.
        this.visitMetadataNode(currentNode);
        this.visitNode(currentNode);
        return this.properties;
    }
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

/** Extracts `publicLog2` and `publicLogError2` classifications from a source directory. */
export class TsParser {
    private readonly project: Project;
    private readonly sourceFiles: string[];

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
            return new TsProjectParser(this.project, this.applyEndpoints, this.lowerCaseEvents).parseFiles();
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
        }
        return declarations;
    }
}

export class TsProjectParser {
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
            const visit = (node: ts.Node): void => {
                if (ts.isCallExpression(node) && node.arguments.length > 0) {
                    const expression = node.expression.getText(sourceFile);
                    const isTelemetryCall = expression.includes('publicLog2') || expression.includes('publicLogError2');
                    if (isTelemetryCall && node.arguments[0].getText(sourceFile) !== 'eventName') {
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
        if (!eventArgument || eventArgument.getText() === 'eventName') {
            return undefined;
        }
        const typeArguments = call.getTypeArguments();
        const isClassified = typeArguments.length === 2;
        const eventType = eventArgument.getType();
        if (!eventType.isStringLiteral()) {
            // Unclassified calls with a dynamic name are usually wrappers that forward an event name
            if (isClassified) {
                console.error(`Unable to resolve event name ${call.getFullText().trim()}, skipping....`);
            }
            return undefined;
        }
        const declaredName = String(eventType.getLiteralValue());
        const name = this.lowerCaseEvents ? declaredName.toLowerCase() : declaredName;
        const location = `${call.getSourceFile().getFilePath()}:${call.getStartLineNumber()}`;
        if (!isClassified) {
            // An event sent without a classification only has common properties
            return { name, location, properties: Object.create(null) };
        }
        return { name, location, properties: this.resolveClassification(call, typeArguments[0].getType(), typeArguments[1].getType()) };
    }

    private resolveClassification(call: CallExpression, dataType: Type, classificationType: Type): Dictionary {
        const properties: Dictionary = Object.create(null);
        // publicLog2 is in the form <Event, Classification>; the classification describes each property
        for (const prop of classificationType.getProperties()) {
            const propName = prop.getEscapedName().toLowerCase();
            const resolvedProperties: Dictionary[] = new NodeVisitor(call, propName, this.applyEndpoints).resolveProperties(prop);
            for (const resolved of resolvedProperties) {
                const propInfo = resolved[propName];
                if (propInfo !== null && typeof propInfo === 'object') {
                    this.captureOriginalPropNameForColumnInformation(prop.getEscapedName(), propInfo);
                }
                Object.assign(properties, resolved);
            }
        }
        // Numeric and boolean event data is sent as a measurement
        for (const prop of dataType.getProperties()) {
            const valueDeclaration = prop.getValueDeclaration();
            const property = properties[prop.getEscapedName().toLowerCase()];
            if (valueDeclaration && property !== null && typeof property === 'object' && isMeasurement(prop.getTypeAtLocation(valueDeclaration))) {
                (property as Dictionary).isMeasurement = true;
            }
        }
        return properties;
    }

    private captureOriginalPropNameForColumnInformation(propName: string, property: { type?: string; column?: { name?: string; type: string } }) {
        if (property.column && property.column.name === undefined) {
            property.column.name = propName;
        } else if (typeof property.type === 'string') {
            property.column = { name: propName, type: property.type };
            delete property.type;
        }
    }
}
