// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Parser } from "../../lib/parser";
import { cwd } from 'process';
import * as assertHelper from './assert-helper';
import * as path from 'path';
import * as assert from 'assert';
import { nameSort } from "./declaration-tests";
import { extractAndResolveDeclarations, getResolvedDeclaration } from "../../lib/save-declarations";
import { Property } from "../../lib/common-properties";
import { patchDebugEvents } from "../../lib/debug-patch";
import { ParserOptions } from "../../lib/source-spec";
import { Metadata } from "../../lib/events";

const sourceDir = path.join(cwd(), 'src/tests/mocha/resources/source');
const excludedDirs = [path.join(sourceDir, 'excluded')];
const sourceDir2 = path.join(cwd(), 'src/tests/mocha/resources/source-1')
const multipleExcludes = [path.join(sourceDir2, 'excluded'), path.join(sourceDir2, 'folder2')];
const duplicateEventSourceDir = path.join(cwd(), 'src/tests/mocha/resources/source-duplicate-events');
const duplicateTsEventSourceDir = path.join(cwd(), 'src/tests/mocha/resources/tsparser-tests/duplicate-conflict-tests');

describe('Events Tests', () => {
    it('find files - no exclusions', () => {
        const parser = new Parser([sourceDir], [], false, false);
        //@ts-expect-error accessing private method for testing
        const filePaths = parser.findFilesWithEvents(sourceDir);
        assertHelper.sameValues(filePaths, [
            path.join(cwd(), 'src/tests/mocha/resources/source/file1.ts'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file2.ts'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file3.tsx'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file4.cs'),
            path.join(cwd(), 'src/tests/mocha/resources/source/excluded/excludedFile.ts')]);
    });
    it('find files - with exclusions', () => {
        const parser = new Parser([sourceDir], excludedDirs, false, false);
        //@ts-expect-error accessing private method for testing
        const filePaths = parser.findFilesWithEvents(sourceDir);
        assertHelper.sameValues(filePaths, [
            path.join(cwd(), 'src/tests/mocha/resources/source/file1.ts'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file2.ts'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file3.tsx'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file4.cs'),
        ]);
    });
    it('find files - with multiple exclusions', () => {
        const parser = new Parser([sourceDir2], multipleExcludes, false, false);
        //@ts-expect-error accessing private method for testing
        const filePaths = parser.findFilesWithEvents(sourceDir2);
        assertHelper.sameValues(filePaths, [path.join(cwd(), 'src/tests/mocha/resources/source-1/folder1/file1.ts')]);
    });
    it('extract event declaration', async () => {
        const parser = new Parser([sourceDir], excludedDirs, false, false);
        //@ts-expect-error accessing private method for testing
        const events = parser.findEvents(sourceDir);
        assert.strictEqual(events.dataPoints.length, 5);
        events.dataPoints = nameSort(events.dataPoints);
        assert.strictEqual(events.dataPoints[0].name, 'EFour');
    });
    it('Patch Debug Events', async () => {
        const parser = new Parser([sourceDir], excludedDirs, false, false);
        const declarations = await parser.extractDeclarations();
        patchDebugEvents(declarations.events, '');
        // Since order is non deterministic we filter down to the event we want
        const debug = declarations.events.dataPoints.filter(e => e.name === "debugProtocolErrorResponse");
        assert.strictEqual(debug.length, 1);
    });

    it('fails and reports all locations for duplicate GDPR event conflicts', async () => {
        const previousExitCode = process.exitCode;
        const previousConsoleError = console.error;
        const consoleErrors: string[] = [];
        try {
            process.exitCode = 0;
            console.error = (...args: unknown[]) => {
                consoleErrors.push(args.map(arg => String(arg)).join(' '));
            };

            const parserOptions: ParserOptions = {
                eventPrefix: '',
                applyEndpoints: false,
                patchDebugEvents: false,
                lowerCaseEvents: false,
                silenceOutput: true,
                verbose: false
            };

            await assert.rejects(() => extractAndResolveDeclarations([{
                sourceDirs: [duplicateEventSourceDir],
                excludedDirs: [],
                parserOptions
            }]));

            assert.ok(consoleErrors.some(msg => msg.includes("Duplicate telemetry event declaration 'DuplicateEvent' has conflicting details at:")));
            assert.ok(consoleErrors.some(msg => msg.includes('source-duplicate-events/file1.ts')));
            assert.ok(consoleErrors.some(msg => msg.includes('source-duplicate-events/file2.ts')));
        } finally {
            process.exitCode = previousExitCode;
            console.error = previousConsoleError;
        }
    });

    it('fails and reports all locations for duplicate TS event conflicts', async () => {
        const previousExitCode = process.exitCode;
        const previousConsoleError = console.error;
        const consoleErrors: string[] = [];
        try {
            process.exitCode = 0;
            console.error = (...args: unknown[]) => {
                consoleErrors.push(args.map(arg => String(arg)).join(' '));
            };

            const parserOptions: ParserOptions = {
                eventPrefix: '',
                applyEndpoints: false,
                patchDebugEvents: false,
                lowerCaseEvents: false,
                silenceOutput: true,
                verbose: false
            };

            await assert.rejects(() => extractAndResolveDeclarations([{
                sourceDirs: [duplicateTsEventSourceDir],
                excludedDirs: [],
                parserOptions
            }]));

            assert.ok(consoleErrors.some(msg => msg.includes("Duplicate telemetry event declaration 'DuplicateTsEvent' has conflicting details at:")));
            assert.ok(consoleErrors.some(msg => msg.includes('duplicate-conflict-tests/file1.ts')));
            assert.ok(consoleErrors.some(msg => msg.includes('duplicate-conflict-tests/file2.ts')));
        } finally {
            process.exitCode = previousExitCode;
            console.error = previousConsoleError;
        }
    });
});
describe('Resolve Tests', () => {
    it('resolve inline + include', async () => {
        const parserOptions: ParserOptions = {
            eventPrefix: '',
            applyEndpoints: true,
            patchDebugEvents: false,
            lowerCaseEvents: false,
            silenceOutput: true,
            verbose: false
        };
        const declarations = await getResolvedDeclaration([sourceDir], excludedDirs, parserOptions);
        assert.ok(declarations.events);
        declarations.events.dataPoints = nameSort(declarations.events.dataPoints);
        assert.strictEqual(declarations.events.dataPoints.length, 5);
        assert.ok(declarations.commonProperties);
        assert.strictEqual(declarations.commonProperties.properties.length, 2);
        assert.deepStrictEqual(declarations.commonProperties.properties[0], new Property('timestamp', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
        assert.deepStrictEqual(declarations.commonProperties.properties[1], new Property('machineid', 'EndUserPseudonymizedInformation', 'FeatureInsight', undefined, undefined, undefined, 'MacAddressHash'));
        assert.strictEqual(declarations.events.dataPoints[0].properties.length, 5);
        assert.strictEqual(declarations.events.dataPoints[1].properties.length, 5);
        const e1Properties = declarations.events.dataPoints[1].properties;
        assert.deepStrictEqual(e1Properties[0], new Property('property_EOneP1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
        assert.deepStrictEqual(e1Properties[1], new Property('property_EOneP2', 'CallstackOrException', 'PerformanceAndHealth', undefined, undefined, undefined, 'none'));
        assert.deepStrictEqual(e1Properties[2], new Property('property_EOneP3', 'SystemMetaData', 'FeatureInsight', '1.57.0', "lramos15", "Test event", 'none'));
        assert.deepStrictEqual(e1Properties[3], new Property('measurement_EOneM1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none', true));
        assert.deepStrictEqual(e1Properties[4], new Property('measurement_EOneM<NUMBER>', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none', true));
        const testCSEOneProperties = declarations.events.dataPoints[4].properties;
        assert.deepStrictEqual(testCSEOneProperties[0], new Metadata('owner', 'jonathanyi'));
        assert.deepStrictEqual(testCSEOneProperties[1], new Metadata('comment', 'Output to Console log test event.'));
        assert.deepStrictEqual(testCSEOneProperties[2], new Property('property_ECSharpP1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, "NA"));
        assert.deepStrictEqual(testCSEOneProperties[3], new Property('property_ECSharpP2', 'CallstackOrException', 'PerformanceAndHealth', undefined, undefined, undefined, "NA"));
        assert.deepStrictEqual(testCSEOneProperties[4], new Property('property_ECSharpP3', 'SystemMetaData', 'FeatureInsight', "1.57.0", "jonathanjyi", "Test event", "none", undefined));
        assert.deepStrictEqual(testCSEOneProperties[5], new Property('measurement_ECSharpM1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none', true));
        assert.deepStrictEqual(testCSEOneProperties[6], new Property('measurement_ECSharpM<NUMBER>', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none', true));
    })
});