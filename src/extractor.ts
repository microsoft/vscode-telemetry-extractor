#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options } from './cli-options';
import { printHelp } from './cli-help';
import { writeToFile, extractAndResolveDeclarations } from './lib/save-declarations';
import { convertConfigToSourceSpecs } from './lib/source-spec';
import type { ParserOptions, SourceSpec } from './lib/source-spec';
import { logMessage } from './lib/logger';
import type { OutputtedDeclarations } from './lib/declarations';

async function main() {
    if (options.config) {
        const declarations = await extractAndResolveDeclarations(convertConfigToSourceSpecs(options.config));
        if (options.outputDir) {
            await writeToFile(options.outputDir, declarations, options.fileName || 'config-resolved', !options.silenceOutput);
        } else {
            console.log(JSON.stringify(declarations));
        }
        return;
    }

    if (options.help || !options.sourceDir) {
        printHelp();
        return;
    }

    const parserOptions: ParserOptions = {
        eventPrefix: options.eventPrefix,
        applyEndpoints: options.applyEndpoints,
        patchDebugEvents: false,
        lowerCaseEvents: options.lowerCaseEvents,
        silenceOutput: options.silenceOutput,
        verbose: options.verbose
    };
    logMessage('....running.', parserOptions.silenceOutput);
    const sourceSpec: SourceSpec = {
        sourceDirs: options.sourceDir,
        excludedDirs: options.excludedDir,
        parserOptions
    };
    const declarations = await extractAndResolveDeclarations([sourceSpec]);
    if (!options.outputDir) {
        console.log(JSON.stringify(declarations));
        return;
    }
    const { tableInfos, ...gdprDeclarations }: OutputtedDeclarations = declarations;
    await writeToFile(options.outputDir, gdprDeclarations, options.fileName || 'declarations-resolved', !options.silenceOutput);
    if (options.tableInfo) {
        await writeToFile(options.outputDir, tableInfos, options.fileName ? `${options.fileName}-tableInfo` : 'tableInfo', !options.silenceOutput);
    }
}

main().catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
});
