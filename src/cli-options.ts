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

const optionDefinitions = [
    { name: 'sourceDir', alias: 's', type: String, multiple: true},
    { name: 'excludedDirPattern', alias: 'x', type: String, multiple: true, defaultValue: [] },
    { name: 'outputDir', alias: 'o', type: String },
    { name: 'patchDebugEvents', alias: 'p', type: Boolean, defaultValue: false },
    { name: 'patchWebsiteEvents', alias: 'w', type: Boolean, defaultValue: false },
    { name: 'applyEndpoints', alias: 'e', type: Boolean, defaultValue: false},
    { name: 'includeIsMeasurement', alias: 'm', type: Boolean, defaultValue: false}
];

export interface ParserOptions {
    eventPrefix: string;
    addDebugEventsWorkaround: boolean;
    addWebsiteEventsWorkaround: boolean;
    includeIsMeasurement: boolean;
    applyEndpoints: boolean;
}

export const options = resolveDirectories(commandLineArgs(optionDefinitions, { partial: false}));