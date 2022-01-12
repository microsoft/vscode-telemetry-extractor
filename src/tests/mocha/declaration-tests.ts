// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Parser } from "../../lib/parser";
import { Property, CommonProperties } from '../../lib/common-properties';
import { cwd } from 'process';
import * as path from 'path';
import * as assert from 'assert';
import { Event, Wildcard } from "../../lib/events";
import { Fragment } from "../../lib/fragments";
import { getResolvedDeclaration } from '../../lib/save-declarations';
import { ParserOptions } from "../../lib/source-spec";

const sourceDirs = [path.join(cwd(), 'src/tests/mocha/resources/source')];
const excludedDirs = [path.join(sourceDirs[0], 'excluded')];

export function nameSort(arrayToSort: Array<Event | Fragment>) {
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
describe('GDPR Declaration Tests', () => {
    it('extract declarations', async () => {
        const parser = new Parser(sourceDirs, excludedDirs, true, false);
        const declarations = await parser.extractDeclarations();
        assert.ok(declarations);
        assert.strictEqual(declarations.events.dataPoints.length, 3);
        assert.strictEqual(declarations.fragments.dataPoints.length, 7);
        assert.strictEqual(declarations.commonProperties.properties.length, 2);
        assert.deepStrictEqual(declarations.commonProperties.properties[0], new Property('timestamp', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
        assert.deepStrictEqual(declarations.commonProperties.properties[1], new Property('machineid', 'EndUserPseudonymizedInformation', 'FeatureInsight', undefined, undefined, undefined,  'MacAddressHash'));
        // We don't care what order they're read in but we want to have a consistent order so we sort them
        declarations.events.dataPoints = nameSort(declarations.events.dataPoints);
        assert.strictEqual(declarations.events.dataPoints[0].name, 'E1');
        assert.strictEqual(declarations.events.dataPoints[1].name, 'E2');
        assert.strictEqual(declarations.events.dataPoints[2].name, 'E3');
        // We don't care what order they're read in but we want to have a consistent order so we sort them
        declarations.fragments.dataPoints = nameSort(declarations.fragments.dataPoints);
        assert.strictEqual(declarations.fragments.dataPoints[0].name, 'F0');
        assert.strictEqual(declarations.fragments.dataPoints[1].name, 'F1');
        assert.strictEqual(declarations.fragments.dataPoints[2].name, 'F2');
        assert.strictEqual(declarations.fragments.dataPoints[3].name, 'F3');
        assert.strictEqual(declarations.fragments.dataPoints[4].name, 'F4');
        assert.strictEqual(declarations.fragments.dataPoints[5].name, 'F5');
        assert.strictEqual(declarations.fragments.dataPoints[6].name, 'F6');
    });
    it('resolve declarations', async () => {
        const parserOptions: ParserOptions = {
            eventPrefix: '',
            applyEndpoints: true,
            patchDebugEvents: false,
            lowerCaseEvents: false,
            silenceOutput: true,
            verbose: false
        };
        const declarations = await getResolvedDeclaration(sourceDirs, excludedDirs, parserOptions);
        assert.ok(declarations);
        assert.strictEqual(declarations.events.dataPoints.length, 3);
        assert.strictEqual(declarations.commonProperties.properties.length, 2);
    });
    it('Wildcard test', async () => {
        const parser = new Parser([path.resolve(cwd(), 'src/tests/mocha/resources/source-2')], [], false, false);
        const declarations = await parser.extractDeclarations();
        assert.ok(declarations);
        assert.ok(declarations.events);
        assert.strictEqual(declarations.events.dataPoints[0].properties.length, 3);
        assert.ok(declarations.events.dataPoints[0].properties[2] instanceof Wildcard);
    });
});