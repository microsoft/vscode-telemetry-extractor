// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { options } from './cli-options';
import { ParserOptions } from './cli-options';
import * as path from 'path';
import { saveExtensionDeclarations } from './lib/save-declarations';

export interface SourceSpec {
    sourceDirs: string[],
    excludedDirs: string[],
    parserOptions: ParserOptions
};

const defaultParserOptions: ParserOptions = {
    eventPrefix: '',
    addDebugEventsWorkaround: options.patchDebugEvents,
    includeIsMeasurement: options.includeIsMeasurement,
    applyEndpoints: options.applyEndpoints
};

// If they're different from default we generate a new one, else we keep the same 
function generateParserOptions(eventPrefix = '', addDebugEventsWorkaround: boolean) {
    if (eventPrefix != '' || addDebugEventsWorkaround != defaultParserOptions.addDebugEventsWorkaround) {
        const newParserOptions: ParserOptions = {
            eventPrefix: eventPrefix,
            addDebugEventsWorkaround: addDebugEventsWorkaround,
            includeIsMeasurement: options.includeIsMeasurement,
            applyEndpoints: options.applyEndpoints
        };
        return newParserOptions;
    } else {
        return defaultParserOptions;
    }
}

function generateSourceSpec (eventPrefix: string, sourceDirs: string[], addDebugEventsWorkaround = false): SourceSpec {
    const sourceSpec: SourceSpec = {
        // The commandline only specifies one source for extensions and therefore it's a single element array
        sourceDirs: sourceDirs.map(s => path.resolve(options.sourceDir[0], s)),
        excludedDirs: [],
        parserOptions: generateParserOptions(eventPrefix, addDebugEventsWorkaround)
    };
    return sourceSpec;
}

const sourceSpecs: SourceSpec[] = [
    generateSourceSpec('', ['vscode-extension-telemetry']),
    // --- built-in ---
    generateSourceSpec('typescript-language-features/',  ['vscode/extensions/typescript-language-features', 'TypeScript']),
    generateSourceSpec('git/', ['vscode/extensions/git']),
    generateSourceSpec('vscode-markdown/', ['vscode/extensions/markdown-language-features']),
    generateSourceSpec('html-language-features/', ['vscode/extensions/html-language-features', 'vscode-html-languageservice']),
    generateSourceSpec('json-language-features/', ['vscode/extensions/json-language-features', 'vscode-json-languageservice']),
    // --- debug adapters ---
    generateSourceSpec('ms-vscode.extensionhost/', ['vscode-chrome-debug-core', 'vscode-node-debug2'], true),
    generateSourceSpec('vscode.extensionhost/', ['vscode-chrome-debug-core', 'vscode-node-debug2'], true),
    generateSourceSpec('ms-vscode.node2/', ['vscode-chrome-debug-core', 'vscode-node-debug2'], true),
    generateSourceSpec('ms-vscode.node<NUMBER>/', ['vscode-chrome-debug-core', 'vscode-node-debug2'], true),
    generateSourceSpec('ms-vscode.node/', ['vscode-chrome-debug-core', 'vscode-node-debug'], true),
    generateSourceSpec('msjsdiag.chrome/', ['vscode-chrome-debug-core', 'vscode-chrome-debug'], true),
    // --- market place extensions ---
    generateSourceSpec('lukehoban.go/', ['vscode-go']),
    generateSourceSpec('ms-vscode.go/', ['vscode-go']),
    generateSourceSpec('vscode-docker/', ['vscode-docker']),
    generateSourceSpec('azure-account/', ['vscode-azure-account']),
    generateSourceSpec('ms-vscode.mono/', ['vscode-mono-debug'], true)
];

console.log(`...running`);
saveExtensionDeclarations(sourceSpecs, options.outputDir);