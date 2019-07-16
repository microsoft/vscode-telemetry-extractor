/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import * as assert from 'assert';

describe('CLI Tests', () => {
    it('Help Command Test', () => {
        const response = cp.execSync('node ./out/extractor.js --help');
        // Just look for a few key words to ensure the command works as expected
        assert.strictEqual(response.includes('Displays the help dialog'), true);
        assert.strictEqual(response.includes('telemetry annotation from code.'), true);
    });
});