// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { extractAndResolveDeclarations, writeToFile } from "./lib/save-declarations";
import { options, ParserOptions } from "./cli-options";

const parserOptions: ParserOptions = {
    eventPrefix: options.eventPrefix,
    includeIsMeasurement: options.includeIsMeasurement,
    applyEndpoints: options.applyEndpoints
};

console.log('....running.');
extractAndResolveDeclarations(options.sourceDir, options.excludedDirPattern, parserOptions).then((declarations) => {
    writeToFile(options.outputDir, declarations, 'declarations-resolved', true);
});
