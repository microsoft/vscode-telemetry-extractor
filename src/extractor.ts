#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options, ParserOptions } from './cli-options';
import { PathLike, readFileSync } from 'fs';
import * as path from 'path';
import { cwd } from 'process';
import { writeToFile, extractAndResolveDeclarations } from './lib/save-declarations';

export function convertConfigToSourceSpecs(file: PathLike): SourceSpec[] {
    try {
        const config = JSON.parse(readFileSync(file).toString());
        const sourceSpecs: SourceSpec[] = [];
        for (const key in config) {
            const spec = config[key];
            // Some defaults
            spec.excludedDirs = spec.excludedDirs ? spec.excludedDirs : [];
            spec.workingDir = spec.workingDir ? spec.workingDir : cwd();
            spec.patchDebugEvents = spec.patchDebugEvents ? spec.patchDebugEvents : false;
            spec.lowerCaseEvents = spec.lowerCaseEvents ? spec.lowerCaseEvents : false;
            const parserOptions: ParserOptions = {
                eventPrefix: spec.eventPrefix ? spec.eventPrefix : '',
                applyEndpoints: spec.applyEndpoints,
                patchDebugEvents: spec.patchDebugEvents,
                lowerCaseEvents: spec.lowerCaseEvents
            }
            const sourceSpec: SourceSpec = {
                sourceDirs: resolveDirectories(spec.sourceDirs, spec.workingDir),
                excludedDirs: resolveDirectories(spec.excludedDirs, spec.workingDir),
                parserOptions: parserOptions
            }
            sourceSpecs.push(sourceSpec);
        }
        return sourceSpecs;
    } catch (err) {
        console.error(err);
        return [];
    }
}

export interface SourceSpec {
    sourceDirs: string[],
    excludedDirs: string[],
    parserOptions: ParserOptions
};

if (options.config) {
    const sourceSpecs = convertConfigToSourceSpecs(options.config);
    extractAndResolveDeclarations(sourceSpecs).then((declarations) => {
        if (options.outputDir) {
            writeToFile(options.outputDir, declarations, 'config-resolved', true);
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
        lowerCaseEvents: false
    };
    console.log('....running.');
    const sourceSpec: SourceSpec = {
        sourceDirs: resolveDirectories(options.sourceDir),
        excludedDirs: options.excludedDirm ? resolveDirectories(options.excludedDir) : [],
        parserOptions: parserOptions
    };
    extractAndResolveDeclarations([sourceSpec]).then((declarations) => {
        if (options.outputDir) {
            writeToFile(options.outputDir, declarations, 'declarations-resolved', true);
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