// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { convertConfigToSourceSpecs } from '../../lib/source-spec';

describe('convertConfigToSourceSpecs', () => {
    let directory: string;
    let config: string;

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry config '));
        config = path.join(directory, 'config.json');
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it('resolves directories against the working directory and applies defaults', () => {
        fs.writeFileSync(config, JSON.stringify([
            { workingDir: directory, sourceDirs: ['a', 'b'], excludedDirs: ['a/excluded'], eventPrefix: 'p/', applyEndpoints: true },
            { sourceDirs: ['c'], silenceOutput: true },
            { sourceDirs: ['d'], silenceOuput: true }
        ]));
        const specs = convertConfigToSourceSpecs(config);
        assert.deepStrictEqual(specs[0], {
            sourceDirs: [path.join(directory, 'a'), path.join(directory, 'b')],
            excludedDirs: [path.join(directory, 'a', 'excluded')],
            parserOptions: { eventPrefix: 'p/', applyEndpoints: true, patchDebugEvents: false, lowerCaseEvents: false, silenceOutput: false, verbose: false }
        });
        assert.deepStrictEqual(specs[1].sourceDirs, [path.resolve('c')]);
        assert.strictEqual(specs[1].parserOptions.silenceOutput, true);
        assert.strictEqual(specs[2].parserOptions.silenceOutput, true);
    });

    it('throws instead of returning no sources when the config cannot be read', () => {
        assert.throws(() => convertConfigToSourceSpecs(path.join(directory, 'missing.json')), /Unable to read extractor config/);
        fs.writeFileSync(config, '[{');
        assert.throws(() => convertConfigToSourceSpecs(config), /Unable to read extractor config/);
        fs.writeFileSync(config, '"sourceDirs"');
        assert.throws(() => convertConfigToSourceSpecs(config), /must contain an array of source specs/);
        fs.writeFileSync(config, JSON.stringify([{ eventPrefix: 'p/' }]));
        assert.throws(() => convertConfigToSourceSpecs(config), /must list at least one entry in sourceDirs/);
    });
});
