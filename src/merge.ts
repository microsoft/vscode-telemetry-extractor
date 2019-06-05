// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from 'fs';
import * as path from 'path';
import { cwd } from 'process';
import { writeToFile } from './lib/save-declarations';

function mergeTelmetryFiles(mergeDir: string) {
    const mergedTelemetry = Object.create(null);
    const fileNames = fs.readdirSync(mergeDir);
    fileNames.forEach((fileName) => {
        if (fileName.includes('.json')) {
            const fileContents = fs.readFileSync(path.resolve(mergeDir, fileName));
            const telemetryData = JSON.parse(fileContents.toString());
            mergedTelemetry[fileName.replace('.json', '')] = telemetryData;
        }
    });
    return mergedTelemetry;
}

const telemetryData = mergeTelmetryFiles(path.resolve(cwd(), 'merger'));
writeToFile(path.resolve(cwd(), 'merger'), telemetryData, 'merged-telemetry', true);