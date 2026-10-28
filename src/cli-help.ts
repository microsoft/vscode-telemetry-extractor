// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { optionDefinitions } from './cli-options';

export function printHelp() {
    console.log('Allows the extraction of telemetry annotation from code. For more details please read: https://github.com/microsoft/vscode-telemetry-extractor/blob/main/README.md\n');
    const documented = optionDefinitions.filter(opt => opt.description);
    const maxLength = Math.max(...documented.map(opt => opt.name.length));
    for (const opt of documented) {
        const alias = opt.alias ? `-${opt.alias} ` : '   ';
        console.log(`${alias}--${opt.name.padEnd(maxLength)}\t\t\t${opt.description}`);
    }
}
