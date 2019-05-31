import { saveDeclarations } from "./lib/save-declarations";
import { options, ParserOptions } from "./cli-options";

const parserOptions: ParserOptions = {
    eventPrefix: '',
    addDebugEventsWorkaround: options.patchDebugEvents,
    addWebsiteEventsWorkaround: options.patchWebsiteEvents,
    includeIsMeasurement: options.includeIsMeasurement,
    applyEndpoints: options.applyEndpoints
};

console.log('....running.');
saveDeclarations(options.sourceDir, options.excludedDirPattern, parserOptions, options.outputDir);