// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from 'path';
import { Parser } from './parser';
import { ParserOptions } from '../cli-options';
import * as fileWriter from './file-writer';
import { resolveDeclarations, Declarations, OutputtedDeclarations } from './declarations';
import { transformOutput } from './object-converter';
import { patchWebsiteEvents } from './website-patch';
import { Events } from './events';
import { SourceSpec } from '../cli-extract-extensions';
import { CommonProperties } from './common-properties';
import { patchDebugEvents } from './debug-patch';
import { TsParser } from './ts-parser';

export function writeToFile(outputDir: string, contents: object, fileName: string, emitProgressMessage: boolean) {
    const json = JSON.stringify(contents, null, 4);
    const outputFile = path.resolve(outputDir, `${fileName}.json`);
    if (emitProgressMessage) console.log(`...writing ${outputFile}`);
    return fileWriter.writeFile(outputFile, json);
}

export async function getResolvedDeclaration(sourceDirs: Array<string>, excludedDirs: Array<string>, options: ParserOptions, emitProgressMessage = true) {
    if (emitProgressMessage) {
        console.log('...extracting');
    }
    const parser = new Parser(sourceDirs, excludedDirs, options.includeIsMeasurement, options.applyEndpoints);
    let declarations = await parser.extractDeclarations();
    declarations = resolveDeclarations(declarations);
    return declarations;
}

export async function saveDeclarations(sourceDirs: Array<string>, excludedDirs: Array<string>, options: ParserOptions, outputDir: string) {
    try {
        const declarations = await getResolvedDeclaration(sourceDirs, excludedDirs, options);
        // We will just apply the website events after the resolve process since they're already resolved
        if (options.addWebsiteEventsWorkaround) {
            patchWebsiteEvents(declarations.events);
        }
        const formattedDeclarations: any = await transformOutput({events: declarations.events, commonProperties: declarations.commonProperties});
        // We parse the events declared with types and then overwrite
        const typescriptDeclarations = new TsParser(sourceDirs, excludedDirs, options.includeIsMeasurement, options.applyEndpoints).parseFiles();
        for (const dec in typescriptDeclarations) {
            formattedDeclarations.events[dec] = typescriptDeclarations[dec];
        }
        writeToFile(outputDir, formattedDeclarations, 'declarations-resolved', true);
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}

export async function saveExtensionDeclarations(sourceSpecs: Array<SourceSpec>, outputDir: string) {
    try {
        const allDeclarations: OutputtedDeclarations = {events: new Events(), commonProperties: new CommonProperties()};
        for (const spec of sourceSpecs) {
            const declarations = await getResolvedDeclaration(spec.sourceDirs, spec.excludedDirs, spec.parserOptions);
            if (spec.parserOptions.eventPrefix != '') {
                declarations.events.dataPoints = declarations.events.dataPoints.map((event) => {
                    event.name = spec.parserOptions.eventPrefix + event.name;
                    return event;
                });
            }
            if (spec.parserOptions.addDebugEventsWorkaround) {
                patchDebugEvents(declarations.events, spec.parserOptions.eventPrefix);
            }
            // We concatenate each extensions properties into a central one
            // Throwing out fragments as they have already been used to resolve that extensions declarations
            allDeclarations.commonProperties.properties = allDeclarations.commonProperties.properties.concat(declarations.commonProperties.properties);
            allDeclarations.events.dataPoints = allDeclarations.events.dataPoints.concat(declarations.events.dataPoints);
        }
        const formattedDeclarations = await transformOutput(allDeclarations);
        writeToFile(outputDir, formattedDeclarations, 'declarations-extensions-resolved', true);
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}
