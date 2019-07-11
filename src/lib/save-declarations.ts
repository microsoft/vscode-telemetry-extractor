// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from 'path';
import { Parser } from './parser';
import { ParserOptions } from '../cli-options';
import * as fileWriter from './file-writer';
import { resolveDeclarations, Declarations, OutputtedDeclarations } from './declarations';
import { transformOutput } from './object-converter';
import { Events } from './events';
import { SourceSpec } from '../cli-extract-extensions';
import { CommonProperties } from './common-properties';
import { TsParser } from './ts-parser';
import { patchDebugEvents } from './debug-patch';

export function writeToFile(outputDir: string, contents: object, fileName: string, emitProgressMessage: boolean) {
    const json = JSON.stringify(contents);
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

export async function extractAndResolveDeclarationsDEPRECATED(sourceDirs: Array<string>, excludedDirs: Array<string>, options: ParserOptions): Promise<{events: any, commonProperties: any}> {
    try {
        const declarations = await getResolvedDeclaration(sourceDirs, excludedDirs, options);
        // We parse the events declared with types and then overwrite
        let typescriptDeclarations = Object.create(null);
        sourceDirs.forEach((dir) => {
            Object.assign(typescriptDeclarations, new TsParser(dir, excludedDirs, options.includeIsMeasurement, options.applyEndpoints).parseFiles());
        });
        if (options.eventPrefix != '') {
            declarations.events.dataPoints = declarations.events.dataPoints.map((event) => {
                event.name = options.eventPrefix + event.name;
                return event;
            });
            const modifiedDeclartions = Object.create(null);
            // Modify the object keys to be prefixed with the specified prefix
            for (const key in typescriptDeclarations) {
                modifiedDeclartions[options.eventPrefix + key] = typescriptDeclarations[key];
            }
            typescriptDeclarations = modifiedDeclartions;
            
        }
        const formattedDeclarations: any = await transformOutput({ events: declarations.events, commonProperties: declarations.commonProperties });
        for (const dec in typescriptDeclarations) {
            formattedDeclarations.events[dec] = typescriptDeclarations[dec];
        }
        return Promise.resolve(formattedDeclarations);
    } catch (error) {
        console.error(`Error: ${error}`);
        return Promise.reject(error);
    }
}

export async function extractAndResolveDeclarations(sourceSpecs: Array<SourceSpec>): Promise<{events: any, commonProperties: any}> {
    try {
        const allDeclarations: OutputtedDeclarations = { events: new Events(), commonProperties: new CommonProperties() };
        const allTypeScriptDeclarations = Object.create(null);
        for (const spec of sourceSpecs) {
            const declarations = await getResolvedDeclaration(spec.sourceDirs, spec.excludedDirs, spec.parserOptions);
            let typescriptDeclarations = Object.create(null);
            // The parser does not know how to handle multiple source directories due to different TS configs, so we manually have to parse each source dir
            spec.sourceDirs.forEach((dir) => {
                Object.assign(typescriptDeclarations, new TsParser(dir, spec.excludedDirs, spec.parserOptions.includeIsMeasurement, spec.parserOptions.applyEndpoints).parseFiles());
            });
            if (spec.parserOptions.eventPrefix != '') {
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
                if (spec.parserOptions.patchDebugEvents) {
	                patchDebugEvents(declarations.events, spec.parserOptions.eventPrefix);
	            }
            }
            // We concatenate each extensions properties into a central one
            // Throwing out fragments as they have already been used to resolve that extensions declarations
            allDeclarations.commonProperties.properties = allDeclarations.commonProperties.properties.concat(declarations.commonProperties.properties);
            allDeclarations.events.dataPoints = allDeclarations.events.dataPoints.concat(declarations.events.dataPoints);
            Object.assign(allTypeScriptDeclarations, typescriptDeclarations);
        }
        const formattedDeclarations: any = await transformOutput(allDeclarations);
        for (const dec in allTypeScriptDeclarations) {
            formattedDeclarations.events[dec] = allTypeScriptDeclarations[dec];
        }
        return Promise.resolve(formattedDeclarations);
    } catch (error) {
        console.error(`Error: ${error}`);
        return Promise.reject(error);
    }
}
