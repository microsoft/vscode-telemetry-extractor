// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './parser';
import * as fileWriter from './file-writer';
import { resolveDeclarations, OutputtedDeclarations } from './declarations';
import { commonPropertyToOutput, eventToOutput, transformTypeScriptDeclaration } from './object-converter';
import { Events } from './events';
import { TsParser } from './ts-parser';
import { patchDebugEvents } from './debug-patch';
import { ParserOptions, SourceSpec } from './source-spec';
import { logMessage } from './logger';
import { EventDeclaration, formatConflicts, mergeCommonPropertyDeclarations, mergeEventDeclarations, validateCommonPropertyDeclarations, validateDeclarations } from './event-declarations';
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

interface CollectedDeclarations {
    events: EventDeclaration[];
    commonProperties: EventDeclaration[];
    /** Problems already reported while collecting. Specs which share a source directory report the same problem once. */
    reported: Set<string>;
    parseErrorCount: number;
}

/**
 * Collects every event and common property declaration from a source spec, normalized to its output shape.
 */
async function collectDeclarations(spec: SourceSpec, collected: CollectedDeclarations) {
    const { eventPrefix, applyEndpoints, lowerCaseEvents, verbose, silenceOutput } = spec.parserOptions;
    logMessage('...extracting', silenceOutput);
    const report = (errors: readonly string[]) => {
        for (const error of errors) {
            if (!collected.reported.has(error)) {
                collected.reported.add(error);
                console.error(error);
            }
        }
    };

    const parser = new Parser(spec.sourceDirs, spec.excludedDirs, applyEndpoints, lowerCaseEvents);
    const gdpr = resolveDeclarations(await parser.extractDeclarations(), verbose);
    collected.parseErrorCount += parser.errorCount;
    report(gdpr.errors);
    for (const property of gdpr.commonProperties.properties) {
        const { name, property: output } = commonPropertyToOutput(property);
        collected.commonProperties.push({ name, location: property.location ?? 'unknown', source: 'GDPR', event: output });
    }
    for (const event of gdpr.events.dataPoints) {
        collected.events.push({ name: eventPrefix + event.name, location: event.location ?? 'unknown', source: 'GDPR', ...eventToOutput(event) });
    }

    if (spec.parserOptions.patchDebugEvents) {
        const patched = new Events();
        patchDebugEvents(patched, eventPrefix);
        for (const event of patched.dataPoints) {
            collected.events.push({ name: event.name, location: 'patchDebugEvents', source: 'debug-patch', ...eventToOutput(event) });
        }
    }

    // Each source directory may have its own TS config, so they are parsed separately
    for (const dir of spec.sourceDirs) {
        const tsParser = new TsParser(dir, spec.excludedDirs, applyEndpoints, lowerCaseEvents);
        for (const declaration of await tsParser.parseFiles()) {
            collected.events.push({ name: eventPrefix + declaration.name, location: declaration.location, source: 'TS', ...transformTypeScriptDeclaration(declaration.properties) });
        }
        report(tsParser.errors);
    }
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
 * Rejects if an annotation cannot be parsed or resolved, if duplicate declarations disagree, or if a source directory is missing.
 */
export async function extractAndResolveDeclarations(sourceSpecs: Array<SourceSpec>): Promise<OutputtedDeclarations> {
    // An empty inventory would retire every event in the catalog.
    if (sourceSpecs.length === 0) {
        throw new Error('No source specs to extract');
    }
    // A missing checkout must not look like a repository without telemetry.
    const missingDirs = sourceSpecs.flatMap(spec => spec.sourceDirs).filter(dir => !fs.existsSync(dir));
    if (missingDirs.length > 0) {
        missingDirs.forEach(dir => console.error(`Source directory does not exist: ${dir}`));
        throw new Error(`${missingDirs.length} source ${missingDirs.length === 1 ? 'directory does' : 'directories do'} not exist`);
    }

    const collected: CollectedDeclarations = { events: [], commonProperties: [], reported: new Set(), parseErrorCount: 0 };
    for (const spec of sourceSpecs) {
        await collectDeclarations(spec, collected);
    }

    const events = mergeEventDeclarations(collected.events);
    const common = mergeCommonPropertyDeclarations(collected.commonProperties);
    const output: OutputtedDeclarations = {
        events: events.events as OutputtedDeclarations['events'],
        commonProperties: common.commonProperties as unknown as OutputtedDeclarations['commonProperties'],
        tableInfos: events.tableInfos
    };

    const errors = [
        ...validateDeclarations(collected.events),
        ...validateCommonPropertyDeclarations(collected.commonProperties),
        ...formatConflicts(events.conflicts),
        ...formatConflicts(common.conflicts, 'common property'),
        ...findOverloadedProperties(output)
    ];
    errors.forEach(error => console.error(error));
    if (collected.parseErrorCount > 0 || collected.reported.size > 0 || errors.length > 0) {
        throw new Error('Validation failed, please see logs for more information');
    }
    return deepSortKeys(output);
}
