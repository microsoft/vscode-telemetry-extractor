// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { writeToFile } from '../../lib/save-declarations';
import { cwd } from 'process';
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';
describe('File Write Tests', () => {
    it('Write File, No Directory Test', async () => {
        await writeToFile(path.resolve(cwd(), 'src/tests/mocha/resources'), { foo: 'bar' }, 'fileWriteTest', false);
        assert.strictEqual(fs.statSync(path.resolve(cwd(), 'src/tests/mocha/resources', 'fileWriteTest.json')).isFile(), true);
        // Delete the file after or else the test will always "succeed" after it succeeds once
        try {
            fs.unlinkSync(path.resolve(cwd(), 'src/tests/mocha/resources', 'fileWriteTest.json'));
        } catch { }
    });
});