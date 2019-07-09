// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Parser } from "../../lib/parser";
import { cwd } from 'process';
import * as assertHelper from './assert-helper';
import * as path from 'path';
import * as assert from 'assert';
import { nameSort } from "./declaration-tests";
import { getResolvedDeclaration } from "../../lib/save-declarations";
import { ParserOptions } from "../../cli-options";
import { Property } from "../../lib/common-properties";

const sourceDir = path.join(cwd(), 'src/tests/mocha/resources/source');
const excludedDirs = ['excluded'];
const sourceDir2 = path.join(cwd(), 'src/tests/mocha/resources/source-1')
const multipleExcludes = ['excluded', 'folder2'];

describe ('Events Tests', () => {
    it('find files - no exclusions', () => {
        const parser = new Parser([sourceDir], [], false, false);
        //@ts-ignore
        const filePaths = parser.findFilesWithEvents(sourceDir);
        assertHelper.sameValues(filePaths, [
            path.join(cwd(),'src/tests/mocha/resources/source/file1.ts'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file2.ts'),
            path.join(cwd(), 'src/tests/mocha/resources/source/excluded/excludedFile.ts')]);
    });
    it('find files - with exclusions', () => {
        const parser = new Parser([sourceDir], excludedDirs, false, false);
        //@ts-ignore
        const filePaths = parser.findFilesWithEvents(sourceDir);
        assertHelper.sameValues(filePaths, [
            path.join(cwd(),'src/tests/mocha/resources/source/file1.ts'),
            path.join(cwd(), 'src/tests/mocha/resources/source/file2.ts')]);
    });
    it('find files - with multiple exclusions', () => {
        const parser = new Parser([sourceDir2], multipleExcludes, false, false);
        //@ts-ignore
        const filePaths = parser.findFilesWithEvents(sourceDir2);
        assertHelper.sameValues(filePaths, [path.join(cwd(),'src/tests/mocha/resources/source-1/folder1/file1.ts')]);
    });
    it('extract event declaration', async () => {
        const parser = new Parser([sourceDir], excludedDirs, false, false);
        //@ts-ignore
        const events = parser.findEvents(sourceDir);
        assert.strictEqual(events.dataPoints.length, 3);
        events.dataPoints = nameSort(events.dataPoints);
        assert.strictEqual(events.dataPoints[0].name, 'E1');
    });
});
describe('Resolve Tests', () => {
    it('resolve inline + include', async () => {
        const parserOptions: ParserOptions = {
            eventPrefix: '',
            includeIsMeasurement: true,
            applyEndpoints: true
        };
        const declarations = await getResolvedDeclaration([sourceDir], excludedDirs, parserOptions);
        assert.ok(declarations.events);
        declarations.events.dataPoints  = nameSort(declarations.events.dataPoints);
        assert.strictEqual(declarations.events.dataPoints.length, 3);
        assert.ok(declarations.commonProperties);
        assert.strictEqual(declarations.commonProperties.properties.length, 2);
        assert.deepStrictEqual(declarations.commonProperties.properties[0], new Property('timestamp', 'SystemMetaData', 'FeatureInsight', 'none'));
        assert.deepStrictEqual(declarations.commonProperties.properties[1], new Property('machineid', 'EndUserPseudonymizedInformation', 'FeatureInsight', 'MacAddressHash'));
        assert.strictEqual(declarations.events.dataPoints[0].properties.length, 4);
        assert.strictEqual(declarations.events.dataPoints[2].properties.length, 1);
        const e1Properties = declarations.events.dataPoints[0].properties;
        assert.deepStrictEqual(e1Properties[0], new Property('property_E1P1', 'SystemMetaData', 'FeatureInsight', 'none'));
        assert.deepStrictEqual(e1Properties[1], new Property('property_E1P2', 'CallstackOrException', 'PerformanceAndHealth', 'none'));
        assert.deepStrictEqual(e1Properties[2], new Property('measurement_E1M1', 'SystemMetaData', 'FeatureInsight', 'none', true));
        assert.deepStrictEqual(e1Properties[3], new Property('measurement_E1M<NUMBER>', 'SystemMetaData', 'FeatureInsight', 'none', true));
    });
});