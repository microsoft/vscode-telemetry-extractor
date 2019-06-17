// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Project, ScriptTarget, SyntaxKind, Symbol, Node, CallExpression } from "ts-morph";
import {cwd} from 'process';
import * as cp from 'child_process';
import * as path from 'path';
import { rgPath } from "vscode-ripgrep";

interface IGDPRProperty {
    propName: string;
    classification: 'SystemMetaData' | 'CallStackOrException';
    purpose: 'PerformanceAndHealth' | 'FeatureInsight';
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
    private includeIsMeasurement: boolean;
    private applyEndpoints: boolean;
    public properties: Array<any> = [];
    private resolved_property: any = Object.create(null);
    constructor (callexpress_node: Node, prop_name: string, includeIsMeasurement: boolean, applyEndpoints: boolean) {
        this.pl_node = callexpress_node; 
        this.prop_name = prop_name;
        this.original_prop_name = prop_name;
        this.includeIsMeasurement = includeIsMeasurement;
        this.applyEndpoints = applyEndpoints;
    }

    private visitNode(currentNode: Symbol, previousNode?: Symbol) {
        const type = currentNode.getTypeAtLocation(this.pl_node);
        if (type.isStringLiteral() || type.isBooleanLiteral()) {
            if (previousNode) {
                // console.log('Prop name: ' + this.prop_name);
                // console.log(previousNode.getEscapedName())
                // This means it is an inline because we had to recurse deeper than the first level to find the properties
                if (this.prop_name !== previousNode.getEscapedName() && !this.prop_name.includes(`.${previousNode.getEscapedName()}`)) {
                    this.prop_name = `${this.prop_name}.${previousNode.getEscapedName()}`;
                    this.inline = true;
                }
            }
            // If we don't want to include measurements we skip them
            if (currentNode.getEscapedName().toLowerCase() === "ismeasurement" && !this.includeIsMeasurement) return;
            // If we don't want endpoints skip them
            if (currentNode.getEscapedName().toLowerCase() === "endpoint" && !this.applyEndpoints) return;

            // If it's a string we strip the quotes
            if (type.isStringLiteral()) {
                this.resolved_property[currentNode.getEscapedName()] = type.getText().substring(1, type.getText().length - 1);
            }else {
                this.resolved_property[currentNode.getEscapedName()] = type.getText();
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
            this.resolved_property['endpoint'] = 'none';
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
    private sourceDirs: string[];
    private excludedDirs: string[];
    private includeIsMeasurement: boolean;
    private applyEndpoints: boolean;
    private project: Project;
    constructor(sourceDirs: string[], excludedDirs: string[], includeIsMeasurement: boolean, applyEndpoints: boolean) {
        this.sourceDirs = sourceDirs;
        this.excludedDirs = excludedDirs;
        this.includeIsMeasurement = includeIsMeasurement;
        this.applyEndpoints = applyEndpoints;
        this.project = new Project({
            compilerOptions: {
                target: ScriptTarget.ES5
            },
            tsConfigFilePath: '/Users/lramos/vscode-telemetry-extractor/src/telemetry-sources/vscode/src/tsconfig.json',
            addFilesFromTsConfig: false
        });
        const fileGlobs: string[] = [];
        const workingDir = path.join(cwd(), 'src/telemetry-sources');
        this.sourceDirs.forEach((dir) => {
            dir = dir.replace(workingDir, '');
            fileGlobs.push(`'${dir}/**/*.ts'`);
        });
        // Excluded added lasts because order determines what takes effect
        this.excludedDirs.forEach((dir) => {
            dir = dir.replace(workingDir, '');
            fileGlobs.push(`'!**/${dir}/**'`);
        });
        let rg_glob = '';
        for (const fg of fileGlobs) {
            rg_glob += ` --glob ${fg}`;
        }
        const cmd = `${rgPath} --files-with-matches publicLog2 ${rg_glob} --no-ignore`;
        try {
            const retrieved_paths = cp.execSync(cmd, {encoding: 'ascii', cwd: workingDir});
            // Split the paths into an array
            retrieved_paths.split(/(?:\r\n|\r|\n)/g).filter(path => path && path.length > 0).map((f) => {
                f = path.join('src/telemetry-sources', f)
                this.project.addExistingSourceFileIfExists(f);
                return f;
            });
        } catch (err) {
            console.error(err);
        }
    }

    public parseFiles() {
        let publicLogUse: Array<CallExpression> = [];
        this.project.getSourceFiles().forEach((source) => {
            const descendants = source.getDescendantsOfKind(SyntaxKind.CallExpression).filter((c) => c.getText().includes('publicLog2'));
            publicLogUse = descendants.concat(publicLogUse);
        });
        
        const events = Object.create(null);
        publicLogUse.forEach((pl) => {
            try {
                const typeArgs = pl.getTypeArguments();
                if (typeArgs.length != 2) {
                    throw new Error(`Missing generic arguments on public log call ${pl}`);
                }
                // Create an event from the name of the first argument passed in
                const event_name = pl.getArguments()[0].getText().substring(1, pl.getArguments()[0].getText().length-1);
                const created_event = new GDPREvent(event_name);
                // We want the second one because public log is in the form <Event, Classification> and we care about the classification
                const type_properties = typeArgs[1].getType().getProperties();
                type_properties.forEach((prop) => {
                    const propName = prop.getEscapedName();
                    const node_visitor = new NodeVisitor(pl, propName, this.includeIsMeasurement, this.applyEndpoints);
                    created_event.properties = created_event.properties.concat(node_visitor.resolveProperties(prop));
                });
                events[event_name] = Object.create(null);
                created_event.properties.forEach((prop) => {
                    Object.assign(events[event_name], prop);
                });
            } catch (err) {
                //console.error(err);
            }
        });
        return events;
    }
}