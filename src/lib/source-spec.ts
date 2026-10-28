// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PathLike, readFileSync } from 'fs';
import * as path from 'path';
import type { ParserOptions, SourceSpec } from '../../vscode-telemetry-extractor';

export type { ParserOptions, SourceSpec };

interface ConfigEntry {
    sourceDirs?: string[];
    excludedDirs?: string[];
    workingDir?: string;
    eventPrefix?: string;
    applyEndpoints?: boolean;
    patchDebugEvents?: boolean;
    lowerCaseEvents?: boolean;
    silenceOutput?: boolean;
    /** @deprecated Misspelled alias of `silenceOutput` kept for existing configs */
    silenceOuput?: boolean;
    verbose?: boolean;
}

export function convertConfigToSourceSpecs(file: PathLike): SourceSpec[] {
    let config: unknown;
    try {
        config = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
        throw new Error(`Unable to read extractor config ${file}: ${error instanceof Error ? error.message : error}`, { cause: error });
    }
    if (config === null || typeof config !== 'object') {
        throw new Error(`Extractor config ${file} must contain an array of source specs`);
    }
    // Source specs may also be keyed by name
    const entries = Object.entries(config);
    if (entries.length === 0) {
        throw new Error(`Extractor config ${file} does not contain any source specs`);
    }
    return entries.map(([key, entry]: [string, unknown]) => {
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new Error(`Source spec ${key} in ${file} must be an object`);
        }
        const spec = entry as ConfigEntry;
        if (!Array.isArray(spec.sourceDirs) || spec.sourceDirs.length === 0) {
            throw new Error(`Source spec ${key} in ${file} must list at least one entry in sourceDirs`);
        }
        // Relative working directories are resolved against the CWD
        const workingDir = path.resolve(spec.workingDir ?? '');
        const resolve = (dirs: string[]) => dirs.map(dir => path.resolve(workingDir, dir));
        return {
            sourceDirs: resolve(spec.sourceDirs),
            excludedDirs: resolve(spec.excludedDirs ?? []),
            parserOptions: {
                eventPrefix: spec.eventPrefix ?? '',
                applyEndpoints: spec.applyEndpoints ?? false,
                patchDebugEvents: spec.patchDebugEvents ?? false,
                lowerCaseEvents: spec.lowerCaseEvents ?? false,
                silenceOutput: spec.silenceOutput ?? spec.silenceOuput ?? false,
                verbose: spec.verbose ?? false
            }
        };
    });
}
