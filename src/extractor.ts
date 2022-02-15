#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options } from './cli-options';
import * as path from 'path';
import { cwd } from 'process';
import { writeToFile, extractAndResolveDeclarations } from './lib/save-declarations';
import { convertConfigToSourceSpecs, ParserOptions, SourceSpec } from './lib/source-spec';
import { logMessage } from './lib/logger';

if (options.config) {
    const sourceSpecs = convertConfigToSourceSpecs(options.config);
    extractAndResolveDeclarations(sourceSpecs).then((declarations) => {
        if (options.outputDir) {
            writeToFile(options.outputDir, declarations, options.fileName || 'config-resolved', !options.silent);
        } else {
            console.log(JSON.stringify(declarations));
        }
    });
} else if (options.help || !options.sourceDir) {
    require('./cli-help');
} else {
    const parserOptions: ParserOptions = {
        eventPrefix: options.eventPrefix,
        applyEndpoints: options.applyEndpoints,
        patchDebugEvents: false,
        lowerCaseEvents: false,
        silenceOutput: options.silenceOutput,
        verbose: options.verbose
    };
    logMessage('....running.', parserOptions.silenceOutput);
    const sourceSpec: SourceSpec = {
        sourceDirs: resolveDirectories(options.sourceDir),
        excludedDirs: options.excludedDir ? resolveDirectories(options.excludedDir) : [],
        parserOptions: parserOptions
    };
    extractAndResolveDeclarations([sourceSpec]).then((declarations) => {
        if (options.outputDir) {
            writeToFile(options.outputDir, declarations, options.fileName || 'declarations-resolved', !options.silent);
        } else {
            console.log(JSON.stringify(declarations));
        }
    });
}

// Resolves an array of paths
function resolveDirectories(dirs: string[], workingDir?: string): string[] {
    if (workingDir) {
        if (path.isAbsolute(workingDir)) {
            return dirs.map(s => path.resolve(workingDir, s));
        } else {
            return dirs.map(s => path.resolve(cwd(), workingDir, s));
        }
    } else {
        return dirs.map(s => path.resolve(cwd(), s));
    }
}