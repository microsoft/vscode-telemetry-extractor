// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { parentPort, workerData } from 'worker_threads';
import { Project } from 'ts-morph';
import { TsProjectParser, ParserWorkerRequest, ParserWorkerResult } from './ts-parser';

if (!parentPort) {
    throw new Error('Telemetry parser worker requires a parent');
}

const request: ParserWorkerRequest = workerData;
const project = new Project({ compilerOptions: request.compilerOptions });
let result: ParserWorkerResult;

if (request.kind === 'prepare') {
    for (const file of request.sourceFiles) {
        project.addSourceFileAtPathIfExists(file);
    }
    result = new TsProjectParser(project, false, false).prepare();
} else if (request.kind === 'parse') {
    // Keep global declarations and module augmentations visible in every batch.
    for (const file of request.sharedSourceFiles) {
        project.addSourceFileAtPath(file);
    }
    for (const group of request.calls) {
        project.addSourceFileAtPath(group.filePath);
    }
    const parser = new TsProjectParser(project, request.applyEndpoints, request.lowerCaseEvents, request.definitions);
    result = {
        kind: 'parsed',
        events: parser.parseFiles(request.calls, request.events),
        definitions: [...parser.getEventDefinitions()]
    };
} else {
    throw new Error('Unknown telemetry parser worker request');
}

parentPort.postMessage(result);
