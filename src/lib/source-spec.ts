// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PathLike, readFileSync } from 'fs';
import * as path from 'path';
import { cwd } from 'process';


export interface ParserOptions {
    eventPrefix: string;
    applyEndpoints: boolean;
    patchDebugEvents: boolean;
    lowerCaseEvents: boolean;
    silenceOutput: boolean;
    verbose: boolean;
}

export interface SourceSpec {
    sourceDirs: string[],
    excludedDirs: string[],
    parserOptions: ParserOptions
};

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
                lowerCaseEvents: spec.lowerCaseEvents,
                silenceOutput: spec.silenceOuput,
                verbose: spec.verbose
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