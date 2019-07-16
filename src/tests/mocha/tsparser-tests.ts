/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { TsParser } from '../../lib/ts-parser';
import { cwd } from 'process';
import * as path from 'path';
import * as assert from 'assert';
describe('TS Parser Tests', () => {
    const tsParserPath = path.resolve(cwd(), 'src/tests/mocha/resources/tsparser-tests/');
    it('Small Event Tests', () => {
        const tsParser = new TsParser(path.resolve(tsParserPath, 'small-event-tests'), [], true, false);
        const declarations = tsParser.parseFiles();
        assert.ok(declarations['SmallEvent1']);
        assert.ok(declarations['SmallEvent2']);
        assert.ok(declarations['SmallEvent3']);
    });
    it('Large Event Tests', () => {
        const tsParser = new TsParser(path.resolve(tsParserPath, 'large-event-tests'), [], true, false);
        const declarations = tsParser.parseFiles();
        assert.ok(declarations['LargeEvent']);
        assert.strictEqual(Object.keys(declarations['LargeEvent']).length, 50);
    });
    it('Single Include Tests', () => {
        const tsParser = new TsParser(path.resolve(tsParserPath, 'single-include-tests'), [], true, false);
        const declarations = tsParser.parseFiles();
        assert.ok(declarations['Event1']);
        assert.strictEqual(Object.keys(declarations['Event1']).length, 4);
    });
    it('Multiple Include Tests', () => {
        const tsParser = new TsParser(path.resolve(tsParserPath, 'multi-include-tests'), [], true, false);
        const declarations = tsParser.parseFiles();
        assert.ok(declarations['SentEvent']);
        assert.strictEqual(Object.keys(declarations['SentEvent']).length, 6);
    });
});