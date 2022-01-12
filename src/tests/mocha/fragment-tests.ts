// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Parser } from '../../lib/parser';
import { cwd } from 'process';
import * as assert from 'assert';
import * as path from 'path';
import * as assertHelper from './assert-helper';
import { nameSort } from './declaration-tests';
import { Property } from '../../lib/common-properties';
import { getResolvedDeclaration } from '../../lib/save-declarations';
import { ParserOptions } from '../../lib/source-spec';

const sourceDir = path.join(cwd(), 'src/tests/mocha/resources/source');
const excludedDirs = ['excluded'];


describe('GDPR Fragments', () => {

    describe('extract declarations', () => {
        it('Find files with fragments', () => {
            const parser = new Parser([sourceDir], excludedDirs, true, false);
            //@ts-ignore
            const filePaths = parser.findFilesWithFragments(sourceDir);
            assert.ok(filePaths);
            assertHelper.sameValues(filePaths, [
                path.join(cwd(), 'src/tests/mocha/resources/source/folderB/fileB1.ts'),
                path.join(cwd(), 'src/tests/mocha/resources/source/folderA/fileA1.ts'),
                path.join(cwd(), 'src/tests/mocha/resources/source/folderB/fileB2.ts')]);
        });

        it('Extract fragment declarations', () => {
            const parser = new Parser([sourceDir], excludedDirs, true, false);
            //@ts-ignore
            const fragments = parser.findFragments(sourceDir);
            assert.ok(fragments.dataPoints);
            fragments.dataPoints = nameSort(fragments.dataPoints);
            assert.strictEqual(fragments.dataPoints.length, 7);
            assert.deepStrictEqual(fragments.dataPoints[0].properties[0], new Property('property_F0P1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(fragments.dataPoints[0].properties[1], new Property('property_F0P2', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.strictEqual(fragments.dataPoints[1].properties.length, 2);
            assert.strictEqual(fragments.dataPoints[2].properties.length, 2);
            assert.strictEqual(fragments.dataPoints[3].properties.length, 2);
        });
    });

    describe('Resolve Declarations', () => {
        it('Resolve inlines + includes', async () => {
            const parserOptions: ParserOptions = {
                eventPrefix: '',
                applyEndpoints: true,
                patchDebugEvents: false,
                lowerCaseEvents: false,
                silenceOutput: true,
                verbose: false
            };
            const declarations = await getResolvedDeclaration([sourceDir], excludedDirs, parserOptions);
            const resolvedFragments = declarations.fragments;
            assert.ok(resolvedFragments.dataPoints);
            resolvedFragments.dataPoints = nameSort(resolvedFragments.dataPoints);
            assert.strictEqual(resolvedFragments.dataPoints[6].properties.length, 10);
            const frag6 = resolvedFragments.dataPoints[6];
            // Since we know there's no inlines or includes left since it is resolved this is okay
            // They need to be sorted because the order is non deterministic when resolving more than one level deep
            frag6.properties = propertySort(frag6.properties as Array<Property>);
            assert.deepStrictEqual(frag6.properties[0], new Property('property_F1P1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[1], new Property('property_F1P2', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[2], new Property('property_F2P1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[3], new Property('property_F2P2', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[4], new Property('property_F4P1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[5], new Property('property_F5P1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[6], new Property('property_F5P2.property_F2P1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[7], new Property('property_F5P2.property_F2P2', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[8], new Property('property_F5P2.property_F3P1', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
            assert.deepStrictEqual(frag6.properties[9], new Property('property_F5P2.property_F3P2', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
        });

        it('Difficult Resolves', async () => {
            const hardSource = path.join(cwd(), 'src/tests/mocha/resources/difficult-include');
            const parserOptions: ParserOptions = {
                eventPrefix: '',
                applyEndpoints: true,
                patchDebugEvents: false,
                lowerCaseEvents: false,
                silenceOutput: true,
                verbose: false
            };
            const declarations = await getResolvedDeclaration([hardSource], [], parserOptions);
            assert.ok(declarations.fragments);
            declarations.fragments.dataPoints = nameSort(declarations.fragments.dataPoints);
            assert.strictEqual(declarations.fragments.dataPoints.length, 7);
            assert.strictEqual(declarations.fragments.dataPoints[5].properties.length, 3);

        });
    });
});


function propertySort(arrayToSort: Array<Property>) {
    return arrayToSort.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
        } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
        } else {
            return 0;
        }
    });
}