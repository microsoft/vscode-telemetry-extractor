// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options } from './cli-options';

const enum ExtractionMethods {
    Core = "core",
    Extensions = "extensions"
}

if (options.help) {
    require('./cli-help');
} else {
    const extractionMethod = (options.extractionMethod as string).toLowerCase();
    switch (extractionMethod) {
        case ExtractionMethods.Core:
            require('./cli-extract');
            break;
        case ExtractionMethods.Extensions:
            require('./cli-extract-extensions');
            break;
        default:
            console.error('ERROR: Unknown extraction method, valid methods are core or extensions')
            break;
    }
}