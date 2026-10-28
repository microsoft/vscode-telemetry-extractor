// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import { extractFromSources } from './assert-helper';
import type { ParserOptions } from '../../lib/source-spec';

const classified = (name: string, classification: string, data = '{}') => `
    import { publicLog2 } from './publicLog';
    publicLog2<${data}, ${classification}>('${name}', {} as any);
`;

async function extractEvent(source: string, eventName: string) {
    const { errors, result } = await extractFromSources({ 'event.ts': source });
    assert.deepStrictEqual(errors, []);
    return JSON.parse(JSON.stringify((await result).events[eventName]));
}

async function extractErrors(files: Record<string, string>, options: Partial<ParserOptions> = {}) {
    const { errors, result } = await extractFromSources(files, options);
    await assert.rejects(result, /Validation failed/);
    return errors.join('\n');
}

describe('Classification resolution', function () {
    this.timeout(20000);

    it('keeps the fields of each property in an inline group separate', async () => {
        const event = await extractEvent(classified('InlineEvent', `{
            group: {
                first: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Only on first.' };
                second: { classification: 'CallstackOrException'; purpose: 'PerformanceAndHealth' };
            };
        }`), 'InlineEvent');
        assert.deepStrictEqual(event, {
            'group.first': { classification: 'SystemMetaData', purpose: 'FeatureInsight', comment: 'Only on first.' },
            'group.second': { classification: 'CallstackOrException', purpose: 'PerformanceAndHealth' }
        });
    });

    it('applies inline group metadata to properties which do not declare their own', async () => {
        const event = await extractEvent(`
            import { publicLog2 } from './publicLog';
            type StatisticFragment = {
                owner: 'group-owner';
                comment: 'A set of statistics.';
                average: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The average.' };
                max: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; owner: 'max-owner' };
            };
            publicLog2<{ keydown: { average: number; max: number } }, { keydown: StatisticFragment }>('GroupEvent', {} as any);
        `, 'GroupEvent');
        assert.deepStrictEqual(event, {
            'keydown.average': { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', comment: 'The average.', owner: 'group-owner' },
            'keydown.max': { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', comment: 'A set of statistics.', owner: 'max-owner' }
        });
    });

    it('emits literal values without escaping', async () => {
        const event = await extractEvent(classified('QuotedEvent', `{
            comment: 'Sent when "auto" mode starts.';
            mode: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Either "auto" or "manual", e.g. C:\\\\temp' };
        }`), 'QuotedEvent');
        assert.strictEqual(event.comment, 'Sent when "auto" mode starts.');
        assert.strictEqual(event.mode.comment, 'Either "auto" or "manual", e.g. C:\\temp');
    });

    it('accepts either spelling of the endpoint field', async () => {
        const { errors, result } = await extractFromSources({
            'event.ts': classified('EndpointEvent', `{
                camel: { classification: 'EndUserPseudonymizedInformation'; purpose: 'FeatureInsight'; endPoint: 'MacAddressHash' };
                lower: { classification: 'EndUserPseudonymizedInformation'; purpose: 'FeatureInsight'; endpoint: 'MacAddressHash' };
                none: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' };
            }`)
        }, { applyEndpoints: true });
        assert.deepStrictEqual(errors, []);
        const event = (await result).events.EndpointEvent as Record<string, { endPoint?: string }>;
        assert.deepStrictEqual([event.camel.endPoint, event.lower.endPoint, event.none.endPoint], ['MacAddressHash', 'MacAddressHash', 'none']);
    });

    it('detects numeric enums as measurements, however their members are initialized', async () => {
        const event = await extractEvent(`
            import { publicLog2 } from './publicLog';
            enum Explicit { A = 1, B = 2 }
            enum Implicit { A, B }
            const enum Computed { A = 1 << 0, B = 1 << 1 }
            enum Single { A = 5 }
            enum Text { A = 'a' }
            enum Mixed { A = 1, B = 'b' }
            type Data = { explicit: Explicit; implicit: Implicit | undefined; computed: Computed; single: Single; text: Text; mixed: Mixed };
            type Property = { classification: 'SystemMetaData'; purpose: 'FeatureInsight' };
            type Classification = { explicit: Property; implicit: Property; computed: Property; single: Property; text: Property; mixed: Property };
            publicLog2<Data, Classification>('EnumEvent', {} as Data);
        `, 'EnumEvent');
        const measured = Object.keys(event).filter(name => event[name].isMeasurement);
        assert.deepStrictEqual(measured.sort(), ['computed', 'explicit', 'implicit', 'single']);
    });

    it('applies renamed imports only to direct calls, not to methods of the same name', async () => {
        const { errors, result } = await extractFromSources({
            'calls.ts': `
                import { publicLog2 as log } from './publicLog';
                type Classification = { prop: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' } };
                console.log('DiagnosticMessage2');
                log<{ prop: string }, Classification>('AliasedEvent', { prop: '' });
            `
        });
        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(Object.keys((await result).events), ['AliasedEvent']);
    });

    it('finds calls by name, including renamed imports, element access and the RPC proxy', async () => {
        const { errors, result } = await extractFromSources({
            'calls.ts': `
                import { publicLog2 as log } from './publicLog';
                type Classification = { prop: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' } };
                declare const service: { publicLog2: typeof log; publicLog2Wrapper: typeof log; $publicLog2: typeof log };
                log<{ prop: string }, Classification>('RenamedEvent', { prop: '' });
                service['publicLog2']<{ prop: string }, Classification>('ElementAccessEvent', { prop: '' });
                service.publicLog2Wrapper<{ prop: string }, Classification>('WrapperEvent', { prop: '' });
                service.$publicLog2<{ prop: string }, Classification>('ProxyEvent', { prop: '' });
            `
        });
        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(Object.keys((await result).events), ['ElementAccessEvent', 'ProxyEvent', 'RenamedEvent']);
    });
});

describe('Validation', function () {
    this.timeout(20000);

    it('rejects a classification type which cannot be resolved', async () => {
        const report = await extractErrors({
            'event.ts': `
                import { publicLog2 } from './publicLog';
                import type { MissingClassification } from './does-not-exist';
                publicLog2<{ foo: string }, MissingClassification>('UnresolvedEvent', { foo: '' });
            `
        });
        assert.match(report, /The classification type of event 'UnresolvedEvent' at .*event\.ts:4 could not be resolved: MissingClassification/);
    });

    it('rejects a property whose classification cannot be resolved', async () => {
        const report = await extractErrors({
            'event.ts': `
                import { publicLog2 } from './publicLog';
                import type { MissingProperty } from './does-not-exist';
                publicLog2<{ foo: string }, { foo: MissingProperty }>('UnresolvedPropertyEvent', { foo: '' });
            `
        });
        assert.match(report, /The classification of property 'foo' of event 'UnresolvedPropertyEvent' at .*event\.ts:4 could not be resolved/);
    });

    it('rejects a classification type which is impossible (never)', async () => {
        const report = await extractErrors({
            'event.ts': `
                import { publicLog2 } from './publicLog';
                type First = { owner: 'first'; prop: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' } };
                type Second = { owner: 'second' };
                publicLog2<{ prop: string }, First & Second>('RootNeverEvent', { prop: '' });
            `
        });
        assert.match(report, /The classification type of event 'RootNeverEvent' at .*event\.ts:5 is impossible \(never\)/);
    });

    it('rejects a property declared differently by intersected classification types', async () => {
        const report = await extractErrors({
            'event.ts': `
                import { publicLog2 } from './publicLog';
                type First = { provider: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'First.' } };
                type Second = { provider: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Second.' } };
                publicLog2<{ provider: string }, First & Second>('IntersectedEvent', { provider: '' });
            `
        });
        assert.match(report, /The classification of property 'provider' of event 'IntersectedEvent' at .*event\.ts:5 is impossible \(never\)/);
    });

    it('rejects a property which mixes classification fields with nested properties', async () => {
        const report = await extractErrors({
            'event.ts': classified('MixedEvent', `{ group: { classification: 'SystemMetaData'; nested: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' } } }`)
        });
        assert.match(report, /Property 'group' of event 'MixedEvent' at .*event\.ts:3 mixes classification fields \(classification\) with nested properties \(nested\)/);
    });

    it('rejects a classified call whose event name cannot be resolved', async () => {
        const report = await extractErrors({
            'event.ts': `
                import { publicLog2 } from './publicLog';
                declare const name: string;
                publicLog2<{}, {}>(name);
            `
        });
        assert.match(report, /Unable to resolve the name of the event classified at .*event\.ts:4: name/);
    });

    it('applies the same naming rules to __GDPR__ comments and publicLog2 calls', async () => {
        const report = await extractErrors({
            'event.ts': classified('CallEvent2', `{ value: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' } }`),
            'comment.ts': `
                /* __GDPR__
                    "CommentEvent2" : {
                        "value": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                        "incomplete": { "classification": "SystemMetaData" }
                    }
                */
            `
        });
        assert.match(report, /Event name 'CallEvent2' at .*event\.ts:3 \(TS\) ends with a number/);
        assert.match(report, /Event name 'CommentEvent2' at .*comment\.ts:2 \(GDPR\) ends with a number/);
        assert.match(report, /Property name 'value' on event 'CallEvent2' at .*event\.ts:3 \(TS\) is reserved/);
        assert.match(report, /Property name 'value' on event 'CommentEvent2' at .*comment\.ts:2 \(GDPR\) is reserved/);
        assert.match(report, /Property 'incomplete' on event 'CommentEvent2' at .*comment\.ts:2 \(GDPR\) is missing purpose/);
    });

    it('rejects references to fragments which do not exist or include themselves', async () => {
        const report = await extractErrors({
            'comment.ts': `
                /* __GDPR__FRAGMENT__
                    "Loop" : { "\${include}": [ "\${Loop}" ] }
                */
                /* __GDPR__
                    "FragmentEvent" : { "\${include}": [ "\${Missing}", "\${Loop}" ] }
                */
            `
        });
        assert.match(report, /Unresolved fragment reference '\$\{Missing\}' in event 'FragmentEvent' at .*comment\.ts:5/);
        assert.match(report, /Fragment 'Loop' includes itself \(Loop > Loop\) in event 'FragmentEvent'/);
    });

    it('rejects common properties without a classification or purpose', async () => {
        const report = await extractErrors({
            'common.ts': `// __GDPR__COMMON__ "common.id" : { "classification": "SystemMetaData" }`
        });
        assert.match(report, /Common property 'common\.id' at .*common\.ts:1 \(GDPR\) is missing purpose\./);
    });

    it('rejects common properties which are declared differently', async () => {
        const report = await extractErrors({
            'a.ts': `// __GDPR__COMMON__ "common.id" : { "endPoint": "GoogleAnalyticsId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }`,
            'b.ts': `// __GDPR__COMMON__ "common.id" : { "endPoint": "GoogleAnalyticsID", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }`
        }, { applyEndpoints: true });
        assert.ok(report.includes("Duplicate telemetry common property declaration 'common.id' has conflicting details at:"));
        assert.match(report, /"GoogleAnalyticsId" at .*a\.ts:1 \(GDPR\)/);
        assert.match(report, /"GoogleAnalyticsID" at .*b\.ts:1 \(GDPR\)/);
    });
});
