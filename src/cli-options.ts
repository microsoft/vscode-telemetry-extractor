// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import commandLineArgs from 'command-line-args';
import * as path from 'path';

function resolveDirectories(options: commandLineArgs.CommandLineOptions): commandLineArgs.CommandLineOptions {
    const cwd = process.cwd();

    if (options.sourceDir) {
        options.sourceDir = (options.sourceDir as string[]).map(d => path.resolve(cwd, d));
    }
    if (options.outputDir) {
        options.outputDir = path.resolve(cwd, options.outputDir);
    }

    return options;
}

export const optionDefinitions = [
    { name: 'sourceDir', alias: 's', description: 'The folder which you want to extract telemetry from (relative to the CWD)', type: String, multiple: true },
    { name: 'excludedDir', alias: 'x', description: 'A subdirectory which you would like to exclude from the extraction (relative to the CWD)', type: String, multiple: true, defaultValue: [] },
    { name: 'config', alias: 'c', description: 'A JSON Configuration file containing extraction details', type: String },
    { name: 'outputDir', alias: 'o', description: 'The directory which you would like the outputted JSON file to be placed in', type: String },
    { name: 'fileName', alias: 'f', description: 'The name of the outputted JSON file', type: String },
    { name: 'eventPrefix', alias: 'p', type: String, description: 'The string you wish to prepend to every telemetry event.', defaultValue: '' },
    { name: 'help', alias: 'h', type: Boolean, description: 'Displays the help dialog which provides more information on how to use the tool', defaultValue: false },
    { name: 'applyEndpoints', alias: 'e', type: Boolean, defaultValue: false },
    { name: 'silenceOutput', type: Boolean, description: 'Silences all progress messages.', defaultValue: false },
    { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export const options = resolveDirectories(commandLineArgs(optionDefinitions, { partial: true }));