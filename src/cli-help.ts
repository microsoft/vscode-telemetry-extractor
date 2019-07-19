// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { optionDefinitions } from './cli-options';

function buildHelpMessage() {
    console.log('Allows the extraction of telemetry annotation from code. For more details please read: https://github.com/microsoft/vscode-telemetry-extractor/blob/master/README.md\n');
    const optionLengths = optionDefinitions.map((opt) => {
        if (opt.description) {
            return opt.name.length
        }
        return -1;
    });
    const maxLength = Math.max(...optionLengths);
    for (const opt of optionDefinitions) {
        if (opt.description) {
            let outputString = '';
            if (opt.alias) {
                outputString += `-${opt.alias} `;
            }
            // Extra padding if you don't have an alias
            const extraPadding = opt.alias ? 0 : 3;
            outputString += `--${opt.name.padEnd(maxLength + extraPadding)}\t\t\t`;
            outputString += `${opt.description}`;
            console.log(outputString);
        }
    }
}

buildHelpMessage();