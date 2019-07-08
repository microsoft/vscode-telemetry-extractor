#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options } from './cli-options';

const enum ExtractionMethods {
    Core = "core",
    Extensions = "extensions"
}

if (options.help || !(options.sourceDir && options.outputDir)) {
    require('./cli-help');
} else {
    const extractionMethod = (options.extractionMethod as string).toLowerCase();
    switch (extractionMethod) {
        case ExtractionMethods.Extensions:
            require('./cli-extract-extensions');
            break;
        case ExtractionMethods.Core:
        default:
            require('./cli-extract');
            break;
    }
}