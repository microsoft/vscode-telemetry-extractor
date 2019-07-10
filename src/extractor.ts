#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options, ParserOptions } from './cli-options';
import * as fs from 'fs';
import * as path from 'path';
import { SourceSpec } from './cli-extract-extensions';
import { cwd } from 'process';
import { writeToFile, extractAndResolveExtensionDeclarations} from './lib/save-declarations';

const enum ExtractionMethods {
    Core = "core",
    Extensions = "extensions"
}
if (options.config !== '') {
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
            const parserOptions: ParserOptions = {
                eventPrefix: spec.eventPrefix,
                includeIsMeasurement: spec.includeIsMeasurement,
                applyEndpoints: spec.applyEndpoints
            }
            const sourceSpec: SourceSpec = {
                sourceDirs: (spec.sourceDirs as string[]).map(s => path.resolve(spec.workingDir, s)),
                excludedDirs: spec.excludedDirs,
                parserOptions: parserOptions
            }
            sourceSpecs.push(sourceSpec);
        }
        if (options.outputDir) {
            extractAndResolveExtensionDeclarations(sourceSpecs).then((declarations) => {
                writeToFile(options.outputDir, declarations, 'config-resolved', true);
            });
        } else {
            extractAndResolveExtensionDeclarations(sourceSpecs).then(declarations => console.log(JSON.stringify(declarations)));
        }
    } catch (err) {
        console.error(err);
    }
} else if (options.help || !(options.sourceDir && options.outputDir)) {
    require('./cli-help');
} else {
    let extractionMethod = ExtractionMethods.Core.toString();
    if (options.extractionMethod) {
        extractionMethod = (options.extractionMethod as string).toLowerCase();
    }
    switch (extractionMethod) {
        case ExtractionMethods.Extensions:
            require('./cli-extract-extensions');
            break;
        case ExtractionMethods.Core:
        default:
            extractionMethod = ExtractionMethods.Core;
            require('./cli-extract');
            break;
    }
}