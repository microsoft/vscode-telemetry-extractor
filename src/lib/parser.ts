// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from 'path';
import * as fs from 'fs';
import { Fragments } from './fragments';
import { Property, CommonProperties } from './common-properties';
import { Events, Event, TableInfo } from './events';
import { Declarations } from './declarations';
import { mergeFragments, findOrCreate, populateProperties, makeExclusionsRelativeToSource, isMeasurementFlag, declaredEndpoint } from './operations';
import { findFilesWithRipgrep } from './ripgrep';

/**
 * Extracts `__GDPR__` comment annotations. Every event comment is kept as a separate declaration
 * so duplicates can be merged and validated once all sources have been parsed.
 */
export class Parser {
    private _errorCount = 0;

    constructor(
        private readonly sourceDirs: string[],
        private readonly excludedDirs: string[],
        private readonly applyEndpoints: boolean,
        private readonly lowerCaseEvents: boolean
    ) { }

    /** The number of annotations which could not be parsed. */
    public get errorCount() {
        return this._errorCount;
    }

    private reportDeclarationError(kind: string, error: unknown, filePath: string, match: RegExpExecArray) {
        console.error(`${kind} Declaration Error: ${error} in file ${filePath}`);
        console.error(`Source comment:\n${match[0]}`);
        this._errorCount++;
    }

    private toRipGrepOption(dir: string): string[] {
        return ['--glob', `!${dir.replace(/^[/\\]+/, '')}/**`];
    }

    private extractComments(absoluteFilePaths: string[], commentMatcher: RegExp, collector: (filePath: string, match: RegExpExecArray, fileContents: string) => void) {
        for (const absoluteFilePath of absoluteFilePaths) {
            const fileContents = fs.readFileSync(absoluteFilePath, 'utf8');
            for (const match of fileContents.matchAll(commentMatcher)) {
                collector(absoluteFilePath, match, fileContents);
            }
        }
    }

    // Converts relative paths to absolute utilizing the CWD
    private asAbsoluteFilePaths(relativeFilePaths: string[]) {
        return relativeFilePaths.map(r => path.resolve(r));
    }

    // Finds all files containing common telemetry properties in the given directory
    private findFilesWithCommonProperties(sourceDir: string) {
        return this.findFiles('//\\s*__GDPR__COMMON__', sourceDir);
    }

    private findCommonProperties(sourceDir: string) {
        const filesWithCommonProperties = this.asAbsoluteFilePaths(this.findFilesWithCommonProperties(sourceDir));

        const commonPropertyMatcher = /\/\/\s*__GDPR__COMMON__(.*)$/mg;
        const commonPropertyDeclarations = new CommonProperties();
        this.extractComments(filesWithCommonProperties, commonPropertyMatcher, (filePath, match, fileContents) => {
            try {
                const commonPropertyDeclaration = JSON.parse(`{ ${match[1]} }`);
                const propertyName = Object.keys(commonPropertyDeclaration)[0];
                const properties = commonPropertyDeclaration[propertyName];
                const location = `${filePath}:${getLineNumber(fileContents, match.index)}`;
                const prop = new Property(propertyName, properties.classification, properties.purpose, { location });
                if (this.applyEndpoints) {
                    prop.endPoint = declaredEndpoint(properties) ?? 'none';
                }
                if (isMeasurementFlag(properties.isMeasurement)) {
                    prop.isMeasurement = true;
                }
                commonPropertyDeclarations.properties.push(prop);
            } catch (error) {
                this.reportDeclarationError('Common Property', error, filePath, match);
            }
        });
        return commonPropertyDeclarations;
    }

    // Finds all files containing event fragments in the given directory
    private findFilesWithFragments(sourceDir: string) {
        return this.findFiles('/\\*\\s*__GDPR__FRAGMENT__', sourceDir);
    }

    private findFragments(sourceDir: string) {
        const filesWithFragments = this.asAbsoluteFilePaths(this.findFilesWithFragments(sourceDir));

        // Using [\s\S]* instead of .* since the latter does not match when using /m option
        const fragmentMatcher = /\/\*\s*__GDPR__FRAGMENT__([\s\S]*?)\*\//mg;
        const fragmentDeclarations = new Fragments();
        this.extractComments(filesWithFragments, fragmentMatcher, (filePath, match) => {
            try {
                const fragmentDeclaration = JSON.parse(`{ ${match[1]} }`);
                // There's only ever one key per match
                const fragmentName = Object.keys(fragmentDeclaration)[0];
                const fragment = findOrCreate(fragmentDeclarations, fragmentName);
                populateProperties(fragmentDeclaration[fragmentName], fragment, this.applyEndpoints);
            } catch (error) {
                this.reportDeclarationError('Fragment', error, filePath, match);
            }
        });
        return fragmentDeclarations;
    }

    // Find all files with complete events
    private findFilesWithEvents(sourceDir: string) {
        return this.findFiles('/\\*\\s*__GDPR__\\b', sourceDir);
    }

    private findEvents(sourceDir: string) {
        const filesWithEvents = this.asAbsoluteFilePaths(this.findFilesWithEvents(sourceDir));

        // Using [\s\S]* instead of .* since the latter does not match when using /m option
        const eventMatcher = /\/\*\s*__GDPR__\b([\s\S]*?)\*\//mg;
        const eventDeclarations = new Events();
        this.extractComments(filesWithEvents, eventMatcher, (filePath, match, fileContents) => {
            try {
                const eventDeclaration = JSON.parse(`{ ${match[1]} }`);
                const declaredName = Object.keys(eventDeclaration)[0];
                const eventName = this.lowerCaseEvents ? declaredName.toLowerCase() : declaredName;
                const eventProperties = eventDeclaration[declaredName];
                const event = new Event(eventName, `${filePath}:${getLineNumber(fileContents, match.index)}`);
                if (eventProperties['$tableInfo'] !== undefined) {
                    event.tableInfo = TableInfo.fromObject(eventProperties['$tableInfo']);
                }
                populateProperties(eventProperties, event, this.applyEndpoints);
                eventDeclarations.dataPoints.push(event);
            } catch (error) {
                this.reportDeclarationError('Event', error, filePath, match);
            }
        });
        return eventDeclarations;
    }

    // Utilizes a regex to find the files containing the specific pattern
    private findFiles(ripgrepPattern: string, sourceDir: string) {
        const exclusions = makeExclusionsRelativeToSource(sourceDir, this.excludedDirs)
            .filter(exclusion => exclusion !== '')
            .flatMap(exclusion => this.toRipGrepOption(exclusion));
        return findFilesWithRipgrep(sourceDir, ['--glob', '*.ts', '--glob', '*.tsx', '--glob', '*.cs', ...exclusions, '--regexp', ripgrepPattern]);
    }

    private parse(sourceDir: string): Declarations {
        return {
            fragments: this.findFragments(sourceDir),
            events: this.findEvents(sourceDir),
            commonProperties: this.findCommonProperties(sourceDir)
        };
    }

    public async extractDeclarations(): Promise<Declarations> {
        const declarations: Declarations = { fragments: new Fragments(), events: new Events(), commonProperties: new CommonProperties() };
        for (const sourceDir of this.sourceDirs) {
            const result = this.parse(sourceDir);
            mergeFragments(declarations.fragments, result.fragments);
            declarations.events.dataPoints.push(...result.events.dataPoints);
            declarations.commonProperties.properties.push(...result.commonProperties.properties);
        }
        return declarations;
    }
}

function getLineNumber(fileContents: string, index: number | undefined) {
    if (index === undefined) {
        return 1;
    }
    return fileContents.slice(0, index).split(/\r\n|\r|\n/).length;
}
