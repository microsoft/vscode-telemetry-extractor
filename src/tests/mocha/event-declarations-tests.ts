// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import { EventDeclaration, formatConflicts, mergeEventDeclarations } from '../../lib/event-declarations';

function declaration(location: string, event: Record<string, unknown>, extra: Partial<EventDeclaration> = {}): EventDeclaration {
    return { name: 'event', location, source: 'GDPR', event, ...extra };
}

const prop = (fields: Record<string, unknown> = {}) => ({ classification: 'SystemMetaData', purpose: 'FeatureInsight', ...fields });

function plain(value: unknown) {
    return JSON.parse(JSON.stringify(value));
}

describe('mergeEventDeclarations', () => {
    it('merges declarations with disjoint properties and metadata', () => {
        const { events, conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', { owner: 'team', first: prop() }),
            declaration('b.ts:1', { comment: 'An event', second: prop({ isMeasurement: true }) })
        ]);
        assert.deepStrictEqual(conflicts, []);
        assert.deepStrictEqual(plain(events), {
            event: { owner: 'team', comment: 'An event', first: prop(), second: prop({ isMeasurement: true }) }
        });
    });

    it('treats identical declarations as one', () => {
        const { events, conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', { owner: 'team', first: prop() }),
            declaration('b.ts:1', { owner: 'team', first: prop() })
        ]);
        assert.deepStrictEqual(conflicts, []);
        assert.deepStrictEqual(plain(events), { event: { owner: 'team', first: prop() } });
    });

    it('fills in property fields that only one declaration sets', () => {
        const { events, conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', { first: prop({ comment: 'Explained once', isMeasurement: true }) }),
            declaration('b.ts:1', { first: prop({ owner: 'team', isMeasurement: true }) })
        ]);
        assert.deepStrictEqual(conflicts, []);
        assert.deepStrictEqual(plain(events.event.first), prop({ comment: 'Explained once', owner: 'team', isMeasurement: true }));
    });

    it('reports declarations which disagree on whether a property is a measurement', () => {
        const { events, conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', { first: prop({ isMeasurement: true }), second: prop({ isMeasurement: false }) }),
            declaration('b.ts:1', { first: prop({ isMeasurement: false }), second: prop({ isMeasurement: false }) })
        ]);
        assert.deepStrictEqual(conflicts.map(c => c.field), [['first', 'isMeasurement']]);
        assert.deepStrictEqual(plain(events.event.second), prop(), 'false is not emitted');
    });

    it('reports every field which declarations disagree on, with each value and location', () => {
        const { conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', { owner: 'team-a', first: prop({ comment: 'The success state or failure reason.' }) }),
            declaration('b.ts:7', { owner: 'team-a', first: prop({ comment: 'The success state.' }) }, { source: 'TS' }),
            declaration('c.ts:3', { owner: 'team-b', first: prop({ classification: 'CustomerContent' }) })
        ]);
        assert.deepStrictEqual(conflicts.map(c => c.field), [['first', 'comment'], ['owner'], ['first', 'classification']]);
        assert.deepStrictEqual(conflicts[0].declarations, [
            { location: 'a.ts:1', source: 'GDPR', value: 'The success state or failure reason.' },
            { location: 'b.ts:7', source: 'TS', value: 'The success state.' }
        ]);
    });

    it('produces the same result regardless of declaration order', () => {
        const declarations = [
            declaration('a.ts:1', { owner: 'team', first: prop({ comment: 'First' }) }),
            declaration('b.ts:1', { second: prop({ isMeasurement: true }) }),
            declaration('c.ts:1', { first: prop({ endPoint: 'none' }), comment: 'Event' })
        ];
        const forward = mergeEventDeclarations(declarations);
        const reverse = mergeEventDeclarations([...declarations].reverse());
        assert.deepStrictEqual(forward.conflicts, []);
        assert.deepStrictEqual(reverse.conflicts, []);
        assert.deepStrictEqual(plain(reverse.events), plain(forward.events));
    });

    it('does not let one declaration alias or mutate another', () => {
        const first = declaration('a.ts:1', { first: prop() });
        const second = declaration('b.ts:1', { first: prop({ comment: 'Added' }) });
        mergeEventDeclarations([first, second]);
        assert.deepStrictEqual(first.event, { first: prop() });
    });

    it('merges wildcard entries by prefix', () => {
        const wildcard = (prefix: string, classification = 'SystemMetaData') => ({ '${prefix}': prefix, '${classification}': { classification, purpose: 'FeatureInsight' } });
        const merged = mergeEventDeclarations([
            declaration('a.ts:1', { '${wildcard}': [wildcard('a.'), wildcard('b.')] }),
            declaration('b.ts:1', { '${wildcard}': [wildcard('b.'), wildcard('c.')] })
        ]);
        assert.deepStrictEqual(merged.conflicts, []);
        assert.deepStrictEqual(plain(merged.events.event['${wildcard}']), [wildcard('a.'), wildcard('b.'), wildcard('c.')]);

        const conflicting = mergeEventDeclarations([
            declaration('a.ts:1', { '${wildcard}': [wildcard('a.')] }),
            declaration('b.ts:1', { '${wildcard}': [wildcard('a.', 'CustomerContent')] })
        ]);
        assert.deepStrictEqual(conflicting.conflicts.map(c => c.field), [['${wildcard}', 'a.', '${classification}', 'classification']]);
        assert.deepStrictEqual(conflicting.conflicts[0].declarations.map(d => d.value), ['SystemMetaData', 'CustomerContent']);
    });

    it('builds table columns from every declaration and removes them from the properties', () => {
        const tableInfo = { name: 'table', commonProperties: 'standard' as const, backfill: false };
        const { events, tableInfos, conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', { first: prop({ column: { name: 'First', type: 'string' } }) }, { tableInfo }),
            declaration('b.ts:1', { second: prop({ isMeasurement: true, column: { name: 'Second', type: 'int' } }) })
        ]);
        assert.deepStrictEqual(conflicts, []);
        assert.deepStrictEqual(plain(events.event), { first: prop(), second: prop({ isMeasurement: true }) });
        assert.deepStrictEqual(plain(tableInfos), {
            table: {
                ...tableInfo,
                columns: [
                    { name: 'First', type: 'string', bag: { name: 'first', store: 'Properties' } },
                    { name: 'Second', type: 'int', bag: { name: 'second', store: 'Measures' } }
                ]
            }
        });
    });

    it('drops column metadata from events without table info', () => {
        const { events, tableInfos } = mergeEventDeclarations([declaration('a.ts:1', { first: prop({ column: { name: 'First', type: 'string' } }) })]);
        assert.deepStrictEqual(plain(events.event), { first: prop() });
        assert.deepStrictEqual(plain(tableInfos), {});
    });

    it('reports conflicting table info', () => {
        const { conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', {}, { tableInfo: { name: 'table', commonProperties: 'standard', backfill: false } }),
            declaration('b.ts:1', {}, { tableInfo: { name: 'table', commonProperties: 'standard', backfill: true } })
        ]);
        assert.deepStrictEqual(conflicts.map(c => c.field), [['$tableInfo', 'backfill']]);
        assert.deepStrictEqual(conflicts[0].declarations.map(d => d.value), [false, true]);
    });

    it('reports a table declared by more than one event', () => {
        const tableInfo = { name: 'table', commonProperties: 'standard' as const, backfill: false };
        const { conflicts } = mergeEventDeclarations([
            declaration('a.ts:1', {}, { tableInfo }),
            declaration('b.ts:1', {}, { name: 'other', tableInfo })
        ]);
        assert.deepStrictEqual(conflicts.map(c => [c.eventName, c.field]), [['other', ['$tableInfo', 'name']]]);
        assert.deepStrictEqual(conflicts[0].declarations.map(d => d.location), ['a.ts:1', 'b.ts:1']);
    });
});

describe('formatConflicts', () => {
    it('lists the locations and the conflicting values', () => {
        const { conflicts } = mergeEventDeclarations([
            declaration('C:\\src\\a.ts:1', { first: prop({ comment: 'one' }) }),
            declaration('/src/b.ts:2', { first: prop({ comment: 'two' }) }, { source: 'TS' })
        ]);
        assert.deepStrictEqual(formatConflicts(conflicts), [
            "Duplicate telemetry event declaration 'event' has conflicting details at:",
            ' - C:/src/a.ts:1 (GDPR)',
            ' - /src/b.ts:2 (TS)',
            "   Conflicting field 'first > comment':",
            '     "one" at C:/src/a.ts:1 (GDPR)',
            '     "two" at /src/b.ts:2 (TS)'
        ]);
    });
});
