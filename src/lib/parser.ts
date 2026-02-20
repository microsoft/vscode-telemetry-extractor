// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { rgPath } from '@vscode/ripgrep';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';
// Not importing 'process' as tsc claims `process.exitCode` is read-only when it actually is not.
import { Fragments } from './fragments';
import { Property, CommonProperties } from './common-properties';
import { Events } from './events';
import { Declarations } from './declarations';
import { merge, findOrCreate, populateProperties, makeExclusionsRelativeToSource } from './operations';

export interface EventDefinition {
    signature: string;
    location: string;
}

export class Parser {

    private sourceDirs: string[];
    private excludedDirs: string[];
    private applyEndpoints: boolean;

    private lowerCaseEvents: boolean;
    private eventDefinitions: Map<string, EventDefinition[]>;

    constructor(sourceDirs: string[], excludedDirs: string[], applyEndpoints: boolean, lowerCaseEvents: boolean) {
        this.sourceDirs = sourceDirs;
        this.excludedDirs = excludedDirs;
        this.applyEndpoints = applyEndpoints;
        this.lowerCaseEvents = lowerCaseEvents;
        this.eventDefinitions = new Map();
    }

    private toRipGrepOption(dir: string): string[] {
        while (dir.startsWith('/') || dir.startsWith('\\')) {
            dir = dir.substr(1);
        }
        return ['--glob', `!${dir}/**`];
    }

    private extractComments(absoluteFilePaths: string[], commentMatcher: RegExp, collector: (filePath: string, match: RegExpExecArray, fileContents: string) => void) {
        absoluteFilePaths.forEach(absoluteFilePath => {
            if (absoluteFilePath) {
                const fileContents = fs.readFileSync(absoluteFilePath).toString();
                let match;
                while ((match = commentMatcher.exec(fileContents))) {
                    collector(absoluteFilePath, match, fileContents);
                }
            }
        });

    }

    // Converts relative paths to absolute utilizing the CWD
    private asAbsoluteFilePaths(relativeFilePaths: string[]) {
        return relativeFilePaths.map(r => path.resolve(r));
    }

    // Finds all files containing common telemetry properties in the given directory
    private findFilesWithCommonProperties(sourceDir: string) {
        const ripgrepPattern = '//\\s*__GDPR__COMMON__';
        return this.findFiles(ripgrepPattern, sourceDir);
    }

    private findCommonProperties(sourceDir: string) {
        const filesWithCommonProperties = this.asAbsoluteFilePaths(this.findFilesWithCommonProperties(sourceDir));

        const commonPropertyMatcher = /\/\/\s*__GDPR__COMMON__(.*)$/mg;
        const commonPropertyDeclarations = new CommonProperties();
        this.extractComments(filesWithCommonProperties, commonPropertyMatcher, (filePath: string, match: RegExpExecArray) => {
            try {
                const commonPropertyDeclaration = JSON.parse(`{ ${match[1]} }`);
                const propertyName = Object.keys(commonPropertyDeclaration)[0];
                const properties = commonPropertyDeclaration[propertyName];
                // Add all the common properties to the common property object
                const prop = new Property(propertyName, properties.classification, properties.purpose);
                if (this.applyEndpoints) {
                    const endpoint = properties.endPoint ? properties.endPoint : 'none';
                    prop.endPoint = endpoint;
                }
                if (properties.isMeasurement) {
                    prop.isMeasurement = properties.isMeasurement;
                }
                commonPropertyDeclarations.properties.push(prop);
            } catch (error) {
                console.error(`Common Property Declaration Error: ${error} in file ${filePath}`);
                console.error(`Source comment:\n${match[0]}`);
                process.exitCode = 1;
            }
        });
        return commonPropertyDeclarations;
    }

    // Finds all files containing event fragments in the given directory
    private findFilesWithFragments(sourceDir: string) {
        const ripgrepPattern = '/\\*\\s*__GDPR__FRAGMENT__';
        return this.findFiles(ripgrepPattern, sourceDir);
    }

    ///
    private findFragments(sourceDir: string) {
        const filesWithFragments = this.asAbsoluteFilePaths(this.findFilesWithFragments(sourceDir));

        // Using [\s\S]* instead of .* since the latter does not match when using /m option
        const fragmentMatcher = /\/\*\s*__GDPR__FRAGMENT__([\s\S]*?)\*\//mg;
        const fragmentDeclarations = new Fragments();
        this.extractComments(filesWithFragments, fragmentMatcher, (filePath: string, match: RegExpExecArray) => {
            try {
                const fragmentDeclaration = JSON.parse(`{ ${match[1]} }`);
                // There's only ever one key per match
                const fragmentName = Object.keys(fragmentDeclaration)[0];
                // Checks to see if we have a fragment of the given name, else creates.
                const fragment = findOrCreate(fragmentDeclarations, fragmentName);
                const fragmentProperties = fragmentDeclaration[fragmentName];
                populateProperties(fragmentProperties, fragment, this.applyEndpoints);
            } catch (error) {
                console.error(`Fragment Declaration Error: ${error} in file ${filePath}`);
                console.error(`Source comment:\n${match[0]}`);
                process.exitCode = 1;
            }
        });
        return fragmentDeclarations;
    }

    // Find all files with complete events
    private findFilesWithEvents(sourceDir: string) {
        const ripgrepPattern = '/\\*\\s*__GDPR__\\b';
        return this.findFiles(ripgrepPattern, sourceDir);
    }

    private findEvents(sourceDir: string) {
        const filesWithEvents = this.asAbsoluteFilePaths(this.findFilesWithEvents(sourceDir));
        const eventSignatures = new Map<string, string>();

        // Using [\s\S]* instead of .* since the latter does not match when using /m option
        const eventMatcher = /\/\*\s*__GDPR__\b([\s\S]*?)\*\//mg;
        const eventDeclarations = new Events();
        this.extractComments(filesWithEvents, eventMatcher, (filePath: string, match: RegExpExecArray, fileContents: string) => {
            try {
                const eventDeclaration = JSON.parse(`{ ${match[1]} }`);
                let eventName = Object.keys(eventDeclaration)[0];
                eventName = this.lowerCaseEvents ? eventName.toLowerCase() : eventName;
                const eventProperties = eventDeclaration[Object.keys(eventDeclaration)[0]];
                const currentSignature = this.stableSerialize(eventProperties);
                const lineNumber = this.getLineNumber(fileContents, match.index);
                this.addEventDefinition(eventName, currentSignature, `${filePath}:${lineNumber}`);
                const existingSignature = eventSignatures.get(eventName);

                if (existingSignature) {
                    return;
                }

                eventSignatures.set(eventName, currentSignature);
                const event = findOrCreate(eventDeclarations, eventName);
                // Get the propeties which the event possesses
                populateProperties(eventProperties, event, this.applyEndpoints);
            } catch (error) {
                console.error(`Event Declaration Error: ${error} in file ${filePath}`);
                console.error(`Source comment:\n${match[0]}`);
                process.exitCode = 1;
            }
        });
        return eventDeclarations;
    }

    public getEventDefinitions() {
        const definitions = new Map<string, EventDefinition[]>();
        for (const [eventName, entries] of this.eventDefinitions.entries()) {
            definitions.set(eventName, [...entries]);
        }
        return definitions;
    }

    private addEventDefinition(eventName: string, signature: string, location: string) {
        const existing = this.eventDefinitions.get(eventName) ?? [];
        existing.push({ signature, location });
        this.eventDefinitions.set(eventName, existing);
    }

    private getLineNumber(fileContents: string, index: number | undefined) {
        if (index === undefined) {
            return 1;
        }
        return fileContents.slice(0, index).split(/\r\n|\r|\n/).length;
    }

    private stableSerialize(value: unknown): string {
        if (Array.isArray(value)) {
            return `[${value.map((entry) => this.stableSerialize(entry)).join(',')}]`;
        }

        if (value && typeof value === 'object') {
            const entries = Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entryValue]) => `${JSON.stringify(key)}:${this.stableSerialize(entryValue)}`);
            return `{${entries.join(',')}}`;
        }

        return JSON.stringify(value);
    }

    // Utilizes a regex to find the files containing the specific pattern
    private findFiles(ripgrepPattern: string, sourceDir: string) {
        const relativeExclusions = makeExclusionsRelativeToSource(sourceDir, this.excludedDirs);
        const exclusions = relativeExclusions.length === 0 || relativeExclusions[0] === '' ? [] : relativeExclusions.map(this.toRipGrepOption).flat();
        const ripgrepArgs = ['--files-with-matches', '--glob', '*.ts', '--glob', '*.tsx', '--glob', '*.cs', ...exclusions, '--regexp', ripgrepPattern, '--', sourceDir];
        try {
            const filePaths = cp.execFileSync(rgPath, ripgrepArgs, { encoding: 'ascii', cwd: `${sourceDir}` });
            return filePaths.split(/(?:\r\n|\r|\n)/g).filter(path => path && path.length > 0);
        } catch {
            // ripgrep's return code != 0 if there are no matches
            return [];
        }
    }

    private async parse(sourceDir: string): Promise<Declarations> {
        const fragments = this.findFragments(sourceDir);
        const events = this.findEvents(sourceDir);
        const commonProperties = this.findCommonProperties(sourceDir);
        return { fragments: fragments, events: events, commonProperties: commonProperties };
    }

    public extractDeclarations(): Promise<Declarations> {
        return new Promise((resolve) => {
            // Find all the properties for all files
            const promises = this.sourceDirs.map(sd => this.parse(sd));
            // Now we must merge them into one superset of all declarations
            Promise.all(promises).then(parseResult => {
                const declarations = { fragments: new Fragments(), events: new Events(), commonProperties: new CommonProperties() };
                for (const currentResult of parseResult) {
                    merge(declarations.fragments, currentResult.fragments);
                    merge(declarations.events, currentResult.events);
                    // We just concatenate common properties
                    declarations.commonProperties.properties = declarations.commonProperties.properties.concat(currentResult.commonProperties.properties);
                }
                return resolve(declarations);
            });
        });
    }
}
