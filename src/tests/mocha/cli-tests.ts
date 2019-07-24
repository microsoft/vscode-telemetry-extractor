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
    it('Config Test', () => {
        // We want to ensure it can parse config files from the CLI so we spawn a process and then manipulate
        // the stdout back to its object form and assess that.
        const response = cp.execSync('node ./out/extractor.js --config src/tests/mocha/resources/test-config.json', { encoding: 'utf8' });
        const parsedResponse = JSON.parse(response.replace('...extracting', ''));
        assert.ok(parsedResponse['events']['LargeEvent']);
        assert.strictEqual(Object.keys(parsedResponse['events']['LargeEvent']).length, 50);
    }).timeout(3000);
    it('Command Line Arguments Test', () => {
        // Since this runs a a test we already test for the checks are simplistic to just make sure that everything looks good with CLI parsing
        const response = cp.execSync('node ./out/extractor.js -s src/tests/mocha/resources/source --excludedDir src/tests/mocha/resources/source/excluded --eventPrefix test/ --silenceOutput', { encoding: 'utf8' });
        const parsedResponse = JSON.parse(response);
        assert.ok(parsedResponse['events']);
        assert.ok(parsedResponse['events']['test/E1']);
        assert.ok(parsedResponse['commonProperties']);
        assert.ok(!parsedResponse['test/IgnoredEvent']);
    }).timeout(3000);
});