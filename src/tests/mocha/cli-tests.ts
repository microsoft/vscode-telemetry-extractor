import * as cp from 'child_process';
import * as assert from 'assert';
import * as path from 'path';
import { cwd } from 'process';

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
    });
});