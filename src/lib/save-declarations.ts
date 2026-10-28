// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './parser';
import * as fileWriter from './file-writer';
import { resolveDeclarations, OutputtedDeclarations } from './declarations';
import { commonPropertiesToOutput, eventToOutput, transformTypeScriptDeclaration } from './object-converter';
import { Events } from './events';
import { Property } from './common-properties';
import { TsParser } from './ts-parser';
import { patchDebugEvents } from './debug-patch';
import { ParserOptions, SourceSpec } from './source-spec';
import { logMessage } from './logger';
import { EventDeclaration, formatConflicts, mergeEventDeclarations } from './event-declarations';
import { deepSortKeys } from './object-utils';

export async function writeToFile(outputDir: string, contents: object, fileName: string, emitProgressMessage: boolean) {
    if (Object.keys(contents).length === 0) {
        logMessage(`...no events found, skipping file emission!`, !emitProgressMessage);
        return;
    }
    const outputFile = path.resolve(outputDir, `${fileName}.json`);
    logMessage(`...writing ${outputFile}`, !emitProgressMessage);
    await fileWriter.writeFile(outputFile, JSON.stringify(contents));
}

export async function getResolvedDeclaration(sourceDirs: Array<string>, excludedDirs: Array<string>, options: ParserOptions) {
    logMessage('...extracting', options.silenceOutput);
    const parser = new Parser(sourceDirs, excludedDirs, options.applyEndpoints, options.lowerCaseEvents);
    return resolveDeclarations(await parser.extractDeclarations(), options.verbose);
}

/**
 * Collects every event declaration from a source spec, normalized to its output shape.
 * @returns The number of annotations which could not be parsed
 */
async function collectDeclarations(spec: SourceSpec, declarations: EventDeclaration[], commonProperties: Property[]): Promise<number> {
    const { eventPrefix, applyEndpoints, lowerCaseEvents, verbose, silenceOutput } = spec.parserOptions;
    logMessage('...extracting', silenceOutput);

    const parser = new Parser(spec.sourceDirs, spec.excludedDirs, applyEndpoints, lowerCaseEvents);
    const gdpr = resolveDeclarations(await parser.extractDeclarations(), verbose);
    commonProperties.push(...gdpr.commonProperties.properties);
    for (const event of gdpr.events.dataPoints) {
        declarations.push({ name: eventPrefix + event.name, location: event.location ?? 'unknown', source: 'GDPR', ...eventToOutput(event) });
    }

    if (spec.parserOptions.patchDebugEvents) {
        const patched = new Events();
        patchDebugEvents(patched, eventPrefix);
        for (const event of patched.dataPoints) {
            declarations.push({ name: event.name, location: 'patchDebugEvents', source: 'debug-patch', ...eventToOutput(event) });
        }
    }

    // Each source directory may have its own TS config, so they are parsed separately
    for (const dir of spec.sourceDirs) {
        const tsParser = new TsParser(dir, spec.excludedDirs, applyEndpoints, lowerCaseEvents);
        for (const declaration of await tsParser.parseFiles()) {
            declarations.push({ name: eventPrefix + declaration.name, location: declaration.location, source: 'TS', ...transformTypeScriptDeclaration(declaration.properties) });
        }
    }
    return parser.errorCount;
}

/**
 * Finds event properties which are overloaded by a common property of the same name.
 */
function findOverloadedProperties(declarations: OutputtedDeclarations): string[] {
    const errors: string[] = [];
    for (const [eventName, event] of Object.entries(declarations.events)) {
        for (const property of Object.keys(event)) {
            if (declarations.commonProperties[property]) {
                errors.push(`Property ${property} on event ${eventName} is overloaded by a common property`);
            }
        }
    }
    return errors;
}

/**
 * Extracts every event, merging duplicate declarations of the same event across all source specs.
 * Rejects if an annotation cannot be parsed, if duplicate declarations disagree, or if a source directory is missing.
 */
export async function extractAndResolveDeclarations(sourceSpecs: Array<SourceSpec>): Promise<OutputtedDeclarations> {
    // A missing checkout must not look like a repository without telemetry.
    const missingDirs = sourceSpecs.flatMap(spec => spec.sourceDirs).filter(dir => !fs.existsSync(dir));
    if (missingDirs.length > 0) {
        missingDirs.forEach(dir => console.error(`Source directory does not exist: ${dir}`));
        throw new Error(`${missingDirs.length} source ${missingDirs.length === 1 ? 'directory does' : 'directories do'} not exist`);
    }

    const declarations: EventDeclaration[] = [];
    const commonProperties: Property[] = [];
    let annotationErrors = 0;
    for (const spec of sourceSpecs) {
        annotationErrors += await collectDeclarations(spec, declarations, commonProperties);
    }

    const merged = mergeEventDeclarations(declarations);
    const output: OutputtedDeclarations = {
        events: merged.events as OutputtedDeclarations['events'],
        commonProperties: commonPropertiesToOutput(commonProperties) as OutputtedDeclarations['commonProperties'],
        tableInfos: merged.tableInfos
    };

    const errors = [...formatConflicts(merged.conflicts), ...findOverloadedProperties(output)];
    errors.forEach(error => console.error(error));
    if (annotationErrors > 0 || errors.length > 0) {
        throw new Error('Validation failed, please see logs for more information');
    }
    return deepSortKeys(output);
}
