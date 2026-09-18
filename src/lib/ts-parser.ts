// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Project, SyntaxKind, Symbol, Node, CallExpression, Type, ts, CompilerOptions } from "ts-morph";
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { rgPath } from "@vscode/ripgrep";
import { makeExclusionsRelativeToSource } from "./operations";
import { Event, Metadata } from './events';
import { Property } from "./common-properties";
import { parseRipgrepFilePaths } from './ripgrep';
import { EventDefinition } from './event-definition';

const sourceFilesPerBatch = 64;
type ParsedEvents = Record<string, Record<string, unknown>>;

interface TelemetryCall {
    start: number;
    width: number;
}

interface TelemetryCalls {
    filePath: string;
    calls: TelemetryCall[];
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
    events: ParsedEvents;
    definitions: [string, EventDefinition[]][];
};

export type ParserWorkerResult = {
    kind: 'prepared';
    calls: TelemetryCalls[];
    sharedSourceFiles: string[];
} | {
    kind: 'parsed';
    events: ParsedEvents;
    definitions: [string, EventDefinition[]][];
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
    if (type.isNumber()) {
        return true;
    }
    if (type.isBoolean()) {
        return true;
    }

    if (type.isEnum()) {
        return getEnumType(type) === 'number';
    }

    if (type.isUnion()) {
        const unionTypes = type.getUnionTypes();
        return unionTypes.length === 2 &&
            (unionTypes.some(t => t.isNumber()) || unionTypes.some(t => t.isBoolean())) &&
            unionTypes.some(t => t.isUndefined());
    }
    return false;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public properties: Array<any> = [];
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
        if (nodeName !== 'column') {
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

    public resolveProperties(currentNode: Symbol): Array<Property | Metadata> {
        // @lramos15 Actually this.properties is of type any[] and the property data pushing into
        // the array is not an instance of Property.

        // It could be a complex node with nested types or a simple node with a string literal
        // representing some kind of metadata, so we try both visitors.
        this.visitMetadataNode(currentNode);
        this.visitNode(currentNode);
        return this.properties;
    }
}

export class TsParser {
    private sourceDir: string;
    private excludedDirs: string[];
    private applyEndpoints: boolean;
    private lowerCaseEvents: boolean;
    private project: Project;
    private sourceFiles: string[] = [];
    private eventDefinitions: Map<string, EventDefinition[]>;
    constructor(sourceDir: string, excludedDirs: string[], applyEndpoints: boolean, lowerCaseEvents: boolean) {
        this.sourceDir = sourceDir;
        this.excludedDirs = excludedDirs;
        this.applyEndpoints = applyEndpoints;
        this.lowerCaseEvents = lowerCaseEvents;
        this.eventDefinitions = new Map();
        // We search for a TS config as that allows the language service to handle weird imports
        if (fs.existsSync(path.join(this.sourceDir, 'src/tsconfig.json'))) {
            this.project = new Project({
                tsConfigFilePath: path.join(this.sourceDir, 'src/tsconfig.json'),
                skipAddingFilesFromTsConfig: true
            });
        } else if (fs.existsSync(path.join(this.sourceDir, 'tsconfig.json'))) {
            this.project = new Project({
                tsConfigFilePath: path.join(this.sourceDir, 'tsconfig.json'),
                skipAddingFilesFromTsConfig: true
            });
        } else {
            this.project = new Project({});
        }
        const fileGlobs: string[] = [];
        fileGlobs.push(`**/*.ts`);
        // Excluded added lasts because order determines what takes effect
        this.excludedDirs = makeExclusionsRelativeToSource(this.sourceDir, this.excludedDirs);
        this.excludedDirs.forEach((dir) => {
            fileGlobs.push(`!${dir}/**`);
        });
        const rgGlobs = [];
        for (const fg of fileGlobs) {
            rgGlobs.push('--glob');
            rgGlobs.push(fg);
        }

        const ripgrepArgs = ['--files-with-matches', ...rgGlobs, '--no-ignore', 'publicLog2|publicLogError2', this.sourceDir]
        try {
            const retrievedPaths = cp.execFileSync(rgPath, ripgrepArgs, { encoding: 'ascii' });
            this.sourceFiles = parseRipgrepFilePaths(retrievedPaths);
            // Empty catch because this fails when there are no typescript annotations which causes weird error messages
        } catch {
            // No-op
        }
    }

    public async parseFiles() {
        if (this.sourceFiles.length <= sourceFilesPerBatch) {
            for (const file of this.sourceFiles) {
                this.project.addSourceFileAtPathIfExists(file);
            }
            const parser = new TsProjectParser(this.project, this.applyEndpoints, this.lowerCaseEvents, [...this.eventDefinitions]);
            const events = parser.parseFiles();
            this.eventDefinitions = parser.getEventDefinitions();
            return events;
        }

        const compilerOptions = this.project.getCompilerOptions();
        const prepared = await runParserWorker({ kind: 'prepare', sourceFiles: this.sourceFiles, compilerOptions });
        if (prepared.kind !== 'prepared') {
            throw new Error('Telemetry parser worker did not return call locations');
        }

        let events: ParsedEvents = Object.create(null);
        for (let index = 0; index < prepared.calls.length; index += sourceFilesPerBatch) {
            const parsed = await runParserWorker({
                kind: 'parse',
                calls: prepared.calls.slice(index, index + sourceFilesPerBatch),
                sharedSourceFiles: prepared.sharedSourceFiles,
                compilerOptions,
                applyEndpoints: this.applyEndpoints,
                lowerCaseEvents: this.lowerCaseEvents,
                events,
                definitions: [...this.eventDefinitions]
            });
            if (parsed.kind !== 'parsed') {
                throw new Error('Telemetry parser worker did not return declarations');
            }
            events = Object.assign(Object.create(null), parsed.events);
            this.eventDefinitions = new Map(parsed.definitions);
        }
        return events;
    }

    public getEventDefinitions() {
        return new Map([...this.eventDefinitions].map(([event, entries]) => [event, [...entries]]));
    }
}

export class TsProjectParser {
    private eventDefinitions: Map<string, EventDefinition[]>;

    constructor(
        private readonly project: Project,
        private readonly applyEndpoints: boolean,
        private readonly lowerCaseEvents: boolean,
        definitions: [string, EventDefinition[]][] = []
    ) {
        this.eventDefinitions = new Map(definitions);
    }

    public getEventDefinitions() {
        const definitions = new Map<string, EventDefinition[]>();
        for (const [eventName, entries] of this.eventDefinitions.entries()) {
            definitions.set(eventName, [...entries]);
        }
        return definitions;
    }

    private addEventDefinition(eventName: string, properties: Record<string, unknown>, location: string) {
        const existing = this.eventDefinitions.get(eventName) ?? [];
        existing.push({ properties, location });
        this.eventDefinitions.set(eventName, existing);
    }

    private extractConflictProperties(eventProperties: Record<string, unknown>): Record<string, unknown> {
        return { ...eventProperties };
    }

    private collectCalls(): TelemetryCalls[] {
        const publicLogCalls: TelemetryCalls[] = [];
        const publicLogErrorCalls: TelemetryCalls[] = [];
        this.project.getSourceFiles().forEach((source) => {
            const calls: TelemetryCall[] = [];
            const errorCalls: TelemetryCall[] = [];
            const sourceFile = source.compilerNode;
            const visit = (node: ts.Node): void => {
                if (ts.isCallExpression(node) && node.arguments.length > 0) {
                    const expression = node.expression.getText(sourceFile);
                    const isPublicLog = expression.includes('publicLog2');
                    const isPublicLogError = expression.includes('publicLogError2');
                    if ((isPublicLog || isPublicLogError) && node.arguments[0].getText(sourceFile) !== 'eventName') {
                        const call = { start: node.getStart(sourceFile), width: node.getWidth(sourceFile) };
                        if (isPublicLog) {
                            calls.push(call);
                        }
                        if (isPublicLogError) {
                            errorCalls.push(call);
                        }
                    }
                }
                ts.forEachChild(node, visit);
            };
            ts.forEachChild(sourceFile, visit);
            if (calls.length > 0) {
                publicLogCalls.unshift({ filePath: source.getFilePath(), calls });
            }
            if (errorCalls.length > 0) {
                publicLogErrorCalls.push({ filePath: source.getFilePath(), calls: errorCalls });
            }
        });
        return publicLogCalls.concat(publicLogErrorCalls);
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

    private parseCalls(groups: TelemetryCalls[], parseCall: (call: CallExpression) => void): void {
        for (const group of groups) {
            const source = this.project.getSourceFileOrThrow(group.filePath);
            for (const call of group.calls) {
                const node = source.getDescendantAtStartWithWidth(call.start, call.width);
                if (!node || !Node.isCallExpression(node)) {
                    throw new Error(`Could not locate telemetry call in ${group.filePath} at ${call.start}`);
                }
                parseCall(node);
            }
        }
    }

    public parseFiles(calls = this.collectCalls(), previousEvents?: ParsedEvents) {
        const events = Object.create(null);
        if (previousEvents) {
            // Structured cloning does not preserve dictionary prototypes.
            for (const [name, properties] of Object.entries(previousEvents)) {
                events[name] = Object.assign(Object.create(null), properties);
            }
        }
        const parseCall = (pl: CallExpression): void => {
            try {
                const typeArgs = pl.getTypeArguments();
                if (typeArgs.length != 2) {
                    throw new Error(`Missing generic arguments on public log call ${pl}`);
                }
                if (pl.getArguments()[0].getText() === "eventName") {
                    return;
                }
                // Create an event from the name of the first argument passed in
                let event_name = pl.getArguments()[0].getType().isStringLiteral() ? pl.getArguments()[0].getType().getText() : '';
                // If we can't resolve the event_name there is no use continuing
                if (event_name === '') {
                    console.error(`Unable to resolve event name ${pl.getFullText().trim()}, skipping....`);
                    return;
                } else {
                    event_name = event_name.substring(1, event_name.length - 1);
                }
                event_name = this.lowerCaseEvents ? event_name.toLowerCase() : event_name;
                // Ensure there is at least an object available to assign props to
                if (events[event_name] === undefined) {
                    events[event_name] = Object.create(null);
                }
                const created_event = new Event(event_name);
                // We want the second one because public log is in the form <Event, Classification> and we care about the classification
                const type_properties = typeArgs[1].getType().getProperties();
                type_properties.forEach((prop) => {
                    const propName = prop.getEscapedName().toLowerCase();
                    const node_visitor = new NodeVisitor(pl, propName, this.applyEndpoints);
                    const resolved_properties = node_visitor.resolveProperties(prop);
                    for (const rp of resolved_properties) {
                        if (!(rp instanceof Metadata)) {
                            // This cast is necessary since rp is not of type Property although
                            // the resolveProperties claims it to be.
                            const propInfo = (rp as unknown as { [key: string]: object })[propName];
                            if (propInfo !== undefined) {
                                this.captureOriginalPropNameForColumnInformation(prop.getEscapedName(), propInfo);
                            }
                        }
                    }
                    created_event.properties = created_event.properties.concat(resolved_properties);
                });
                created_event.properties.forEach((prop) => {
                    Object.assign(events[event_name], prop);
                });
                this.addEventDefinition(event_name, this.extractConflictProperties(events[event_name]), `${pl.getSourceFile().getFilePath()}:${pl.getStartLineNumber()}`);
                const eventProperties = typeArgs[0].getType().getProperties();
                // Find all eventProperties that have a number or boolean type
                eventProperties.forEach((prop) => {
                    const propName = prop.getEscapedName().toLowerCase();
                    const valueDeclaration = prop.getValueDeclaration();
                    if (valueDeclaration === undefined) {
                        return;
                    }
                    const propType = prop.getTypeAtLocation(valueDeclaration);
                    if (isMeasurement(propType)) {
                        const eventToUpdate = events[event_name][propName];
                        if (!eventToUpdate) {
                            return;
                        }
                        eventToUpdate.isMeasurement = true;
                    }
                });

            } catch {
                if (pl.getArguments()[0].getText() === "eventName") {
                    return;
                }
                // If the publicLog call isn't generic that means we're just sending an event name with no classifications
                // that are unique to that event (it just has common properties)
                let event_name = pl.getArguments()[0].getType().isStringLiteral() ? pl.getArguments()[0].getType().getText() : '';
                // If we can't resolve the event_name this is most likely because it is not a public log call and therefore we skip it
                if (event_name === '') {
                    return;
                } else {
                    event_name = event_name.substring(1, event_name.length - 1);
                }
                event_name = this.lowerCaseEvents ? event_name.toLowerCase() : event_name;
                events[event_name] = {};
                this.addEventDefinition(event_name, this.extractConflictProperties(events[event_name]), `${pl.getSourceFile().getFilePath()}:${pl.getStartLineNumber()}`);
            }
        };

        this.parseCalls(calls, parseCall);
        return events;
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