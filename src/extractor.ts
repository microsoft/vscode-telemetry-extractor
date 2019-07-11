#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options, ParserOptions } from './cli-options';
import * as fs from 'fs';
import * as path from 'path';
import { SourceSpec } from './cli-extract-extensions';
import { cwd } from 'process';
import { writeToFile, extractAndResolveDeclarations} from './lib/save-declarations';

if (options.config) {
    try {
        const config = JSON.parse(fs.readFileSync(options.config).toString());
        const sourceSpecs: SourceSpec[] = [];
        for(const key in config) {
            const spec = config[key];
            // Some defaults
            if (!spec.excludedDirs) {
                spec.excludedDirs = [];
            }
            if (!spec.workingDir) {
                spec.workingDir = cwd();
            }
            if (!spec.patchDebugEvents) {
                spec.patchDebugEvents = false;
            }
            const parserOptions: ParserOptions = {
                eventPrefix: spec.eventPrefix,
                includeIsMeasurement: spec.includeIsMeasurement,
                applyEndpoints: spec.applyEndpoints,
                patchDebugEvents: spec.patchDebugEvents
            }
            const sourceSpec: SourceSpec = {
                sourceDirs: (spec.sourceDirs as string[]).map(s => path.resolve(spec.workingDir, s)),
                excludedDirs: spec.excludedDirs,
                parserOptions: parserOptions
            }
            sourceSpecs.push(sourceSpec);
        }
        extractAndResolveDeclarations(sourceSpecs).then((declarations) => {
            if (options.outputDir) {
                writeToFile(options.outputDir, declarations, 'config-resolved', true);
            } else {
                console.log(JSON.stringify(declarations));
            } 
        });
    } catch (err) {
        console.error(err);
    }
} else if (options.help || !(options.sourceDir && options.outputDir)) {
    require('./cli-help');
} else {
    const parserOptions: ParserOptions = {
        eventPrefix: options.eventPrefix,
        includeIsMeasurement: options.includeIsMeasurement,
        applyEndpoints: options.applyEndpoints,
        patchDebugEvents: false
    };
    console.log('....running.');
    const sourceSpec: SourceSpec = {
        sourceDirs: options.sourceDir,
        excludedDirs: options.excludedDirs === undefined ? [] : options.excludedDirs,
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