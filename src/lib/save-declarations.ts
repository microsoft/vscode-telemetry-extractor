// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from 'path';
import { Parser } from './parser';
import * as fileWriter from './file-writer';
import { resolveDeclarations, OutputtedDeclarations, Declarations } from './declarations';
import { transformOutput } from './object-converter';
import { Events } from './events';
import { CommonProperties } from './common-properties';
import { TsParser } from './ts-parser';
import { patchDebugEvents } from './debug-patch';
import { ParserOptions, SourceSpec } from './source-spec';
import { logMessage } from './logger';
import { Fragments } from './fragments';

function deepSortKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) {
        return obj.map(deepSortKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        const sorted: Record<string, unknown> = Object.create(null);
        for (const key of Object.keys(obj).sort()) {
            sorted[key] = deepSortKeys((obj as Record<string, unknown>)[key]);
        }
        return sorted;
    }
    return obj;
}

export function writeToFile(outputDir: string, contents: object, fileName: string, emitProgressMessage: boolean) {
    if (Object.keys(contents).length === 0) {
        logMessage(`...no events found, skipping file emmision!`, !emitProgressMessage);
        return;
    }
    const json = JSON.stringify(contents);
    const outputFile = path.resolve(outputDir, `${fileName}.json`);
    logMessage(`...writing ${outputFile}`, !emitProgressMessage);
    return fileWriter.writeFile(outputFile, json);
}

export async function getResolvedDeclaration(sourceDirs: Array<string>, excludedDirs: Array<string>, options: ParserOptions) {
    logMessage('...extracting', options.silenceOutput);
    const parser = new Parser(sourceDirs, excludedDirs, options.applyEndpoints, options.lowerCaseEvents);
    let declarations = await parser.extractDeclarations();
    declarations = resolveDeclarations(declarations, options.verbose);
    return declarations;
}

/**
 * Validate the outputted declaration. Looks to ensure that an event property isn't overloaded by a common property
 * @param declarations The declaration output
 */
function validateOutputtedDeclarations(declarations: OutputtedDeclarations) {
    const commonProperties = declarations.commonProperties;
    const events = declarations.events;
    let failedValidation = false;
    for (const event in events) {
        for (const property in events[event]) {
            if (commonProperties[property]) {
                failedValidation = true;
                console.error(`Property ${property} on event ${event} is overloaded by a common property`);
            }
        }
    }
    if (failedValidation) {
        throw new Error('Validation failed, please see logs for more information');
    }
}

export async function extractAndResolveDeclarations(sourceSpecs: Array<SourceSpec>): Promise<OutputtedDeclarations> {
    try {
        const allDeclarations: Declarations = { events: new Events(), commonProperties: new CommonProperties(), fragments: new Fragments() };
        const allTypeScriptDeclarations = Object.create(null);
        for (const spec of sourceSpecs) {
            const declarations = await getResolvedDeclaration(spec.sourceDirs, spec.excludedDirs, spec.parserOptions);
            let typescriptDeclarations = Object.create(null);
            // The parser does not know how to handle multiple source directories due to different TS configs, so we manually have to parse each source dir
            spec.sourceDirs.forEach((dir) => {
                Object.assign(typescriptDeclarations, new TsParser(dir, spec.excludedDirs, spec.parserOptions.applyEndpoints, spec.parserOptions.lowerCaseEvents).parseFiles());
            });
            if (spec.parserOptions.eventPrefix !== '') {
                declarations.events.dataPoints = declarations.events.dataPoints.map((event) => {
                    event.name = spec.parserOptions.eventPrefix + event.name;
                    return event;
                });
                const modifiedDeclartions = Object.create(null);
                // Modify the object keys to be prefixed with the specified prefix
                for (const key in typescriptDeclarations) {
                    modifiedDeclartions[spec.parserOptions.eventPrefix + key] = typescriptDeclarations[key];
                }
                typescriptDeclarations = modifiedDeclartions;
            }
            if (spec.parserOptions.patchDebugEvents) {
                patchDebugEvents(declarations.events, spec.parserOptions.eventPrefix);
            }
            // We concatenate each extensions properties into a central one
            // Throwing out fragments as they have already been used to resolve that extensions declarations
            allDeclarations.commonProperties.properties = allDeclarations.commonProperties.properties.concat(declarations.commonProperties.properties);
            allDeclarations.events.dataPoints = allDeclarations.events.dataPoints.concat(declarations.events.dataPoints);
            Object.assign(allTypeScriptDeclarations, typescriptDeclarations);
        }
        const formattedDeclarations = await transformOutput(allDeclarations);
        for (const dec in allTypeScriptDeclarations) {
            // If there's typescript declarations but we returned a null object
            // We must add the event container to the declarations object
            if (formattedDeclarations.events === undefined) {
                formattedDeclarations.events = Object.create(null);
            }
            formattedDeclarations.events[dec] = allTypeScriptDeclarations[dec];
        }
        validateOutputtedDeclarations(formattedDeclarations);
        return Promise.resolve(deepSortKeys(formattedDeclarations) as OutputtedDeclarations);
    } catch (error) {
        console.error(`Error: ${error}`);
        return Promise.reject(error);
    }
}
