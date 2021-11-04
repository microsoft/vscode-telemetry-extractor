// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Project, SyntaxKind, Symbol, Node, CallExpression } from "ts-morph";
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import { rgPath } from "vscode-ripgrep";
import { makeExclusionsRelativeToSource } from "./operations";

interface IGDPRProperty {
    propName: string;
    classification: 'SystemMetaData' | 'CallstackOrException';
    purpose: 'PerformanceAndHealth' | 'FeatureInsight';
    expiration?: string;
    endpoint?: string;
    isMeasurement?: boolean;
}
class GDPREvent {
    public eventName: string;
    public properties: Array<IGDPRProperty>;
    constructor(name: string) {
        this.eventName = name;
        this.properties = [];
    }
}

class NodeVisitor {

    private pl_node: Node;
    private prop_name: string;
    private inline: boolean = false;
    private original_prop_name: string;
    private applyEndpoints: boolean;
    public properties: Array<any> = [];
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

            // If it's a string we strip the quotes
            if (type.isStringLiteral()) {
                this.resolved_property[currentNode.getEscapedName()] = type.getText().substring(1, type.getText().length - 1);
            } else {
                this.resolved_property[currentNode.getEscapedName()] = type.getText() === 'true';
            }
            return;
        }
        const properties = type.getProperties();
        properties.forEach((prop) => {
            this.visitNode(prop, currentNode);
        });
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

    public resolveProperties(currentNode: Symbol) {
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
    constructor(sourceDir: string, excludedDirs: string[], applyEndpoints: boolean, lowerCaseEvents: boolean) {
        this.sourceDir = sourceDir;
        this.excludedDirs = excludedDirs;
        this.applyEndpoints = applyEndpoints;
        this.lowerCaseEvents = lowerCaseEvents;
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
        fileGlobs.push(`'**/*.ts'`);
        // Excluded added lasts because order determines what takes effect
        this.excludedDirs = makeExclusionsRelativeToSource(this.sourceDir, this.excludedDirs);
        this.excludedDirs.forEach((dir) => {
            fileGlobs.push(`'!${dir}/**'`);
        });
        let rg_glob = '';
        for (const fg of fileGlobs) {
            rg_glob += ` --glob ${fg}`;
        }
        const cmd = `${rgPath} --files-with-matches 'publicLog2|publicLogError2' ${rg_glob} --no-ignore`;
        try {
            const retrieved_paths = cp.execSync(cmd, { encoding: 'utf-8', cwd: this.sourceDir, stdio: ['ignore', 'pipe', 'pipe'] });
            // Split the paths into an array
            retrieved_paths.split(/(?:\r\n|\r|\n)/g).filter(path => path && path.length > 0).map((f) => {
                f = path.join(this.sourceDir, f)
                this.project.addSourceFileAtPathIfExists(f);
                return f;
            });
            // Empty catch because this fails when there are no typescript annotations which causes weird error messages
        } catch(err) { console.error(err); }
    }

    public parseFiles() {
        let publicLogUse: Array<CallExpression> = [];
        this.project.getSourceFiles().forEach((source) => {
            const descendants = source.getDescendantsOfKind(SyntaxKind.CallExpression).filter((c) => c.getExpression().getText().includes('publicLog2'));
            const descendants2 = source.getDescendantsOfKind(SyntaxKind.CallExpression).filter((c) => c.getExpression().getText().includes('publicLogError2'));
            publicLogUse = descendants.concat(publicLogUse, descendants2);
        });

        const events = Object.create(null);
        publicLogUse.forEach((pl) => {
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
                    console.error('Unable to resolve event name, skipping....');
                    return;
                } else {
                    event_name = event_name.substring(1, event_name.length - 1);
                }
                event_name = this.lowerCaseEvents ? event_name.toLowerCase() : event_name;
                const created_event = new GDPREvent(event_name);
                // We want the second one because public log is in the form <Event, Classification> and we care about the classification
                const type_properties = typeArgs[1].getType().getProperties();
                type_properties.forEach((prop) => {
                    const propName = prop.getEscapedName().toLowerCase();
                    const node_visitor = new NodeVisitor(pl, propName, this.applyEndpoints);
                    created_event.properties = created_event.properties.concat(node_visitor.resolveProperties(prop));
                });
                // We don't want to overwrite an event if we have already defined it, we just want to add to it
                if (!events[event_name]) {
                    events[event_name] = Object.create(null);
                }
                created_event.properties.forEach((prop) => {
                    Object.assign(events[event_name], prop);
                });
            } catch (err) {
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
            }
        });
        return events;
    }
}