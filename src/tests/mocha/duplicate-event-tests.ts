// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractAndResolveDeclarations } from '../../lib/save-declarations';
import type { ParserOptions, SourceSpec } from '../../lib/source-spec';
import { captureErrors } from './assert-helper';

const resources = path.resolve('src/tests/mocha/resources/mixed-duplicate-events');

function spec(sourceDirs: string[], options: Partial<ParserOptions> = {}): SourceSpec {
    return {
        sourceDirs,
        excludedDirs: [],
        parserOptions: { eventPrefix: '', applyEndpoints: false, patchDebugEvents: false, lowerCaseEvents: false, silenceOutput: true, verbose: false, ...options }
    };
}

describe('Duplicate event declarations', function () {
    this.timeout(20000);

    it('merges a __GDPR__ comment and a publicLog2 call declaring the same event', async () => {
        const { events } = await extractAndResolveDeclarations([spec([path.join(resources, 'compatible')])]);
        assert.deepStrictEqual(JSON.parse(JSON.stringify(events.MixedEvent)), {
            comment: 'Declared by a comment and by a publicLog2 call.',
            fromcall: { classification: 'SystemMetaData', purpose: 'FeatureInsight', comment: 'Only declared by the call.', isMeasurement: true },
            fromcomment: { classification: 'SystemMetaData', purpose: 'FeatureInsight', comment: 'Only declared by the comment.' },
            owner: 'team-a',
            shared: { classification: 'SystemMetaData', purpose: 'FeatureInsight', comment: 'Declared by both.' }
        });
    });

    it('reports a field which a __GDPR__ comment and a publicLog2 call disagree on', async () => {
        const { errors, result } = await captureErrors(() => extractAndResolveDeclarations([spec([path.join(resources, 'conflicting')])]));
        await assert.rejects(result, /Validation failed/);
        const report = errors.join('\n');
        assert.ok(report.includes("Duplicate telemetry event declaration 'MixedConflictEvent' has conflicting details at:"));
        assert.ok(report.includes("Conflicting field 'outcome > comment'"));
        assert.match(report, /"The success state or failure reason\." at .*conflicting\/comment\.ts:1 \(GDPR\)/);
        assert.match(report, /"The success state\." at .*conflicting\/telemetry\.ts:9 \(TS\)/);
    });

    it('merges declarations from different source specs', async () => {
        const { events } = await extractAndResolveDeclarations([
            spec([path.join(resources, 'compatible')], { eventPrefix: 'ext/' }),
            spec([path.join(resources, 'other-spec')], { eventPrefix: 'ext/' })
        ]);
        assert.deepStrictEqual(Object.keys(events['ext/MixedEvent']), ['comment', 'fromcall', 'fromcomment', 'fromotherspec', 'owner', 'shared']);
    });

    it('produces the same output regardless of source order', async () => {
        const dirs = [path.join(resources, 'compatible'), path.join(resources, 'other-spec')];
        const forward = await extractAndResolveDeclarations([spec(dirs)]);
        const reverse = await extractAndResolveDeclarations([spec([...dirs].reverse())]);
        assert.strictEqual(JSON.stringify(reverse), JSON.stringify(forward));
    });

    it('accepts relative source directories', async () => {
        const absolute = await extractAndResolveDeclarations([spec([path.join(resources, 'compatible')])]);
        const relative = await extractAndResolveDeclarations([spec([path.relative(process.cwd(), path.join(resources, 'compatible'))])]);
        assert.strictEqual(JSON.stringify(relative), JSON.stringify(absolute));
    });

    it('rejects a source directory which does not exist', async () => {
        const missing = path.join(resources, 'missing');
        const { errors, result } = await captureErrors(() => extractAndResolveDeclarations([spec([path.join(resources, 'compatible'), missing])]));
        await assert.rejects(result, /1 source directory does not exist/);
        assert.deepStrictEqual(errors, [`Source directory does not exist: ${missing}`]);
    });
});

describe('Measurement detection', function () {
    this.timeout(20000);
    let directory: string;

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry measurements '));
        fs.copyFileSync(path.resolve('src/tests/mocha/resources/tsparser-tests/publicLog.ts'), path.join(directory, 'publicLog.ts'));
        fs.writeFileSync(path.join(directory, 'event.ts'), `
            import { publicLog2 } from './publicLog';
            const enum Kind { A, B }
            type Data = { optionalFlag: boolean | undefined; optionalCount?: number; kind: Kind | undefined; name: string | undefined };
            type Classification = {
                optionalFlag: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' };
                optionalCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' };
                kind: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' };
                name: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' };
            };
            publicLog2<Data, Classification>('MeasuredEvent', {} as Data);
        `);
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it('reports calls which send the same property as a measurement and as a property', async () => {
        fs.writeFileSync(path.join(directory, 'event.ts'), `
            import { publicLog2 } from './publicLog';
            type Classification = { foo: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Foo.' } };
            publicLog2<{ foo: number }, Classification>('MixedDataEvent', { foo: 1 });
            publicLog2<{ foo: string }, Classification>('MixedDataEvent', { foo: '' });
        `);
        const { errors, result } = await captureErrors(() => extractAndResolveDeclarations([spec([directory])]));
        await assert.rejects(result, /Validation failed/);
        assert.ok(errors.join('\n').includes("Conflicting field 'foo > isMeasurement'"));
    });

    for (const strict of [true, false]) {
        it(`treats optional numbers, booleans and numeric enums as measurements (strict: ${strict})`, async () => {
            fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict } }));
            const { events } = await extractAndResolveDeclarations([spec([directory])]);
            const event = events.MeasuredEvent as Record<string, { isMeasurement?: boolean }>;
            assert.strictEqual(event.optionalflag.isMeasurement, true);
            assert.strictEqual(event.optionalcount.isMeasurement, true);
            assert.strictEqual(event.kind.isMeasurement, true);
            assert.strictEqual(event.name.isMeasurement, undefined);
        });
    }
});

describe('Excluded directories', function () {
    this.timeout(20000);
    let directory: string;

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry exclusions '));
        fs.copyFileSync(path.resolve('src/tests/mocha/resources/tsparser-tests/publicLog.ts'), path.join(directory, 'publicLog.ts'));
        for (const [file, eventName] of [['kept.ts', 'KeptEvent'], ['excluded/nested/skipped.ts', 'ExcludedEvent']]) {
            fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
            const publicLog = path.relative(path.dirname(path.join(directory, file)), path.join(directory, 'publicLog')).replace(/\\/g, '/');
            fs.writeFileSync(path.join(directory, file), `
                import { publicLog2 } from '${publicLog.startsWith('.') ? publicLog : './' + publicLog}';
                /* __GDPR__
                    "${eventName}Comment" : { "owner": "team" }
                */
                publicLog2<{}, { owner: 'team'; comment: 'An event.' }>('${eventName}');
            `);
        }
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it('excludes directories from both __GDPR__ comments and publicLog2 calls', async () => {
        const { events } = await extractAndResolveDeclarations([{ ...spec([directory]), excludedDirs: [path.join(directory, 'excluded')] }]);
        assert.deepStrictEqual(Object.keys(events), ['KeptEvent', 'KeptEventComment']);
    });
});
