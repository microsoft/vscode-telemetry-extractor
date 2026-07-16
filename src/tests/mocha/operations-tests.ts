// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import * as path from 'path';
import { makeExclusionsRelativeToSource, merge, findOrCreate, populateProperties } from '../../lib/operations';
import { Events, Event, Include, Inline, Wildcard, WildcardEntry, Metadata } from '../../lib/events';
import { Fragments, Fragment } from '../../lib/fragments';
import { Property } from '../../lib/common-properties';

describe('makeExclusionsRelativeToSource', () => {
  it('returns relative path for excluded dir under source', () => {
    const sourceDir = path.resolve('/project/src');
    const excludedDirs = [path.resolve('/project/src/excluded')];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, ['excluded']);
  });

  it('returns nested relative path with forward slashes', () => {
    const sourceDir = path.resolve('/project/src');
    const excludedDirs = [path.resolve('/project/src/deep/nested/dir')];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, ['deep/nested/dir']);
  });

  it('ignores excluded dirs outside of source', () => {
    const sourceDir = path.resolve('/project/src');
    const excludedDirs = [path.resolve('/other/place')];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, []);
  });

  it('ignores the source dir itself', () => {
    const sourceDir = path.resolve('/project/src');
    const excludedDirs = [path.resolve('/project/src')];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, []);
  });

  it('handles multiple exclusions', () => {
    const sourceDir = path.resolve('/project/src');
    const excludedDirs = [
      path.resolve('/project/src/excluded'),
      path.resolve('/project/src/node_modules'),
      path.resolve('/other/place')
    ];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, ['excluded', 'node_modules']);
  });

  it('handles empty exclusion list', () => {
    const sourceDir = path.resolve('/project/src');
    const result = makeExclusionsRelativeToSource(sourceDir, []);
    assert.deepStrictEqual(result, []);
  });

  it('ignores sibling dirs with shared prefix', () => {
    const sourceDir = path.resolve('/project/src');
    const excludedDirs = [path.resolve('/project/src-extra')];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, []);
  });

  it('ignores parent directory', () => {
    const sourceDir = path.resolve('/project/src');
    const excludedDirs = [path.resolve('/project')];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, []);
  });

  it('handles source dir with trailing separator', () => {
    const sourceDir = path.resolve('/project/src') + path.sep;
    const excludedDirs = [path.resolve('/project/src/excluded')];
    const result = makeExclusionsRelativeToSource(sourceDir, excludedDirs);
    assert.deepStrictEqual(result, ['excluded']);
  });
});

describe('merge', () => {
  it('merges non-overlapping events', () => {
    const target = new Events();
    target.dataPoints.push(new Event('event1'));
    const source = new Events();
    source.dataPoints.push(new Event('event2'));
    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 2);
    assert.strictEqual(target.dataPoints[0].name, 'event1');
    assert.strictEqual(target.dataPoints[1].name, 'event2');
  });

  it('merges overlapping events with non-overlapping properties', () => {
    const target = new Events();
    const e1 = new Event('shared');
    e1.properties.push(new Property('prop1', 'SystemMetaData', 'FeatureInsight'));
    target.dataPoints.push(e1);

    const source = new Events();
    const e2 = new Event('shared');
    e2.properties.push(new Property('prop2', 'SystemMetaData', 'FeatureInsight'));
    source.dataPoints.push(e2);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    const mergedProperties = target.dataPoints[0].properties;
    assert.strictEqual(mergedProperties.length, 2);
    const propertyNames = mergedProperties.map(p => (p as Property).name).sort();
    assert.deepStrictEqual(propertyNames, ['prop1', 'prop2']);
    assert.strictEqual(new Set(propertyNames).size, propertyNames.length);
  });

  it('merges table info from overlapping events', () => {
    const target = new Events();
    target.dataPoints.push(new Event('shared'));

    const source = new Events();
    const eventWithTableInfo = new Event('shared');
    eventWithTableInfo.tableInfo = {
      name: 'SharedEvents',
      commonProperties: 'standard',
      backfill: false
    };
    source.dataPoints.push(eventWithTableInfo);

    merge(target, source);
    assert.deepStrictEqual(target.dataPoints[0].tableInfo, eventWithTableInfo.tableInfo);
  });

  it('merges non-overlapping fragments', () => {
    const target = new Fragments();
    target.dataPoints.push(new Fragment('frag1'));
    const source = new Fragments();
    source.dataPoints.push(new Fragment('frag2'));
    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 2);
  });

  it('merges empty source into target', () => {
    const target = new Events();
    target.dataPoints.push(new Event('event1'));
    const source = new Events();
    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
  });

  it('does not duplicate identical overlapping events', () => {
    const target = new Events();
    const event = new Event('shared');
    event.properties.push(new Metadata('owner', 'team-a'));
    target.dataPoints.push(event);

    const source = new Events();
    const sameEvent = new Event('shared');
    sameEvent.properties.push(new Metadata('owner', 'team-a'));
    source.dataPoints.push(sameEvent);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    assert.strictEqual(target.dataPoints[0].properties.length, 1);
  });

  it('keeps first metadata when overlapping events have different owners', () => {
    const target = new Events();
    const event = new Event('shared');
    event.properties.push(new Metadata('owner', 'team-a'));
    target.dataPoints.push(event);

    const source = new Events();
    const conflictingEvent = new Event('shared');
    conflictingEvent.properties.push(new Metadata('owner', 'team-b'));
    source.dataPoints.push(conflictingEvent);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    assert.strictEqual(target.dataPoints[0].properties.length, 1);
    assert.deepStrictEqual((target.dataPoints[0].properties[0] as Metadata).value, 'team-a');
  });

  it('does not merge events with conflicting classification', () => {
    const target = new Events();
    const event = new Event('shared');
    event.properties.push(new Property('prop1', 'SystemMetaData', 'FeatureInsight'));
    target.dataPoints.push(event);

    const source = new Events();
    const conflictingEvent = new Event('shared');
    conflictingEvent.properties.push(new Property('prop1', 'CustomerContent', 'FeatureInsight'));
    source.dataPoints.push(conflictingEvent);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    assert.strictEqual(target.dataPoints[0].properties.length, 1);
    assert.strictEqual((target.dataPoints[0].properties[0] as Property).classification, 'SystemMetaData');
  });

  it('does not merge events with conflicting purpose', () => {
    const target = new Events();
    const event = new Event('shared');
    event.properties.push(new Property('prop1', 'SystemMetaData', 'FeatureInsight'));
    target.dataPoints.push(event);

    const source = new Events();
    const conflictingEvent = new Event('shared');
    conflictingEvent.properties.push(new Property('prop1', 'SystemMetaData', 'PerformanceAndHealth'));
    source.dataPoints.push(conflictingEvent);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    assert.strictEqual(target.dataPoints[0].properties.length, 1);
    assert.strictEqual((target.dataPoints[0].properties[0] as Property).purpose, 'FeatureInsight');
  });

  it('merges Include properties from overlapping events', () => {
    const target = new Events();
    const e1 = new Event('shared');
    e1.properties.push(new Include(['fragA', 'fragB']));
    target.dataPoints.push(e1);

    const source = new Events();
    const e2 = new Event('shared');
    e2.properties.push(new Include(['fragB', 'fragC']));
    source.dataPoints.push(e2);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    const includes = target.dataPoints[0].properties.filter(p => p instanceof Include) as Include[];
    assert.strictEqual(includes.length, 1);
    assert.deepStrictEqual(includes[0].includeNames, ['fragA', 'fragB', 'fragC']);
  });

  it('adds Include when target event has none', () => {
    const target = new Events();
    const e1 = new Event('shared');
    e1.properties.push(new Property('prop1', 'SystemMetaData', 'FeatureInsight'));
    target.dataPoints.push(e1);

    const source = new Events();
    const e2 = new Event('shared');
    e2.properties.push(new Include(['fragA']));
    source.dataPoints.push(e2);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    const includes = target.dataPoints[0].properties.filter(p => p instanceof Include) as Include[];
    assert.strictEqual(includes.length, 1);
    assert.deepStrictEqual(includes[0].includeNames, ['fragA']);
  });

  it('merges Inline properties from overlapping events', () => {
    const target = new Events();
    const e1 = new Event('shared');
    e1.properties.push(new Inline('inlineA', ['val1']));
    target.dataPoints.push(e1);

    const source = new Events();
    const e2 = new Event('shared');
    e2.properties.push(new Inline('inlineB', ['val2']));
    source.dataPoints.push(e2);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    const inlines = target.dataPoints[0].properties.filter(p => p instanceof Inline) as Inline[];
    assert.strictEqual(inlines.length, 2);
    assert.strictEqual(inlines[0].inlineName, 'inlineA');
    assert.strictEqual(inlines[1].inlineName, 'inlineB');
  });

  it('does not duplicate Inline with same name on overlapping events', () => {
    const target = new Events();
    const e1 = new Event('shared');
    e1.properties.push(new Inline('inlineA', ['val1']));
    target.dataPoints.push(e1);

    const source = new Events();
    const e2 = new Event('shared');
    e2.properties.push(new Inline('inlineA', ['val1']));
    source.dataPoints.push(e2);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    const inlines = target.dataPoints[0].properties.filter(p => p instanceof Inline) as Inline[];
    assert.strictEqual(inlines.length, 1);
  });

  it('merges Wildcard entries from overlapping events', () => {
    const target = new Events();
    const e1 = new Event('shared');
    const w1 = new Wildcard();
    w1.entries.push(new WildcardEntry('prefix1', { classification: 'SystemMetaData', purpose: 'FeatureInsight' }));
    e1.properties.push(w1);
    target.dataPoints.push(e1);

    const source = new Events();
    const e2 = new Event('shared');
    const w2 = new Wildcard();
    w2.entries.push(new WildcardEntry('prefix2', { classification: 'SystemMetaData', purpose: 'FeatureInsight' }));
    e2.properties.push(w2);
    source.dataPoints.push(e2);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    const wildcards = target.dataPoints[0].properties.filter(p => p instanceof Wildcard) as Wildcard[];
    assert.strictEqual(wildcards.length, 1);
    assert.strictEqual(wildcards[0].entries.length, 2);
    assert.strictEqual(wildcards[0].entries[0].prefix, 'prefix1');
    assert.strictEqual(wildcards[0].entries[1].prefix, 'prefix2');
  });

  it('does not duplicate Wildcard entries with same prefix', () => {
    const target = new Events();
    const e1 = new Event('shared');
    const w1 = new Wildcard();
    w1.entries.push(new WildcardEntry('prefix1', { classification: 'SystemMetaData', purpose: 'FeatureInsight' }));
    e1.properties.push(w1);
    target.dataPoints.push(e1);

    const source = new Events();
    const e2 = new Event('shared');
    const w2 = new Wildcard();
    w2.entries.push(new WildcardEntry('prefix1', { classification: 'SystemMetaData', purpose: 'FeatureInsight' }));
    e2.properties.push(w2);
    source.dataPoints.push(e2);

    merge(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    const wildcards = target.dataPoints[0].properties.filter(p => p instanceof Wildcard) as Wildcard[];
    assert.strictEqual(wildcards.length, 1);
    assert.strictEqual(wildcards[0].entries.length, 1);
  });
});

describe('findOrCreate', () => {
  it('creates new event when not found', () => {
    const events = new Events();
    const result = findOrCreate(events, 'newEvent');
    assert.strictEqual(result.name, 'newEvent');
    assert.ok(result instanceof Event);
    assert.strictEqual(events.dataPoints.length, 1);
  });

  it('creates new fragment when not found', () => {
    const fragments = new Fragments();
    const result = findOrCreate(fragments, 'newFrag');
    assert.strictEqual(result.name, 'newFrag');
    assert.ok(result instanceof Fragment);
    assert.strictEqual(fragments.dataPoints.length, 1);
  });

  it('returns existing event and still appends to dataPoints', () => {
    const events = new Events();
    const existing = new Event('existing');
    events.dataPoints.push(existing);
    const result = findOrCreate(events, 'existing');
    assert.strictEqual(result, existing);
    // Note: findOrCreate always pushes, so length becomes 2
    assert.strictEqual(events.dataPoints.length, 2);
  });
});

describe('populateProperties', () => {
  it('populates a simple property', () => {
    const event = new Event('test');
    populateProperties({
      'myProp': { classification: 'SystemMetaData', purpose: 'FeatureInsight' }
    }, event);
    assert.strictEqual(event.properties.length, 1);
    const prop = event.properties[0] as Property;
    assert.strictEqual(prop.name, 'myProp');
    assert.strictEqual(prop.classification, 'SystemMetaData');
    assert.strictEqual(prop.purpose, 'FeatureInsight');
  });

  it('populates an include', () => {
    const event = new Event('test');
    populateProperties({
      '${include}': ['Fragment1']
    }, event);
    assert.strictEqual(event.properties.length, 1);
    assert.ok(event.properties[0] instanceof Include);
  });

  it('populates an inline', () => {
    const event = new Event('test');
    populateProperties({
      'inlineProp': { '${inline}': ['Fragment1'] }
    }, event);
    assert.strictEqual(event.properties.length, 1);
    assert.ok(event.properties[0] instanceof Inline);
  });

  it('populates metadata properties', () => {
    const event = new Event('test');
    populateProperties({
      'owner': 'testOwner',
      'comment': 'test comment'
    }, event);
    assert.strictEqual(event.properties.length, 2);
    assert.ok(event.properties[0] instanceof Metadata);
    assert.ok(event.properties[1] instanceof Metadata);
  });

  it('applies endpoints when flag is set', () => {
    const event = new Event('test');
    populateProperties({
      'myProp': { classification: 'SystemMetaData', purpose: 'FeatureInsight', endpoint: 'MyEndpoint' }
    }, event, true);
    const prop = event.properties[0] as Property;
    assert.strictEqual(prop.endPoint, 'MyEndpoint');
  });

  it('defaults endpoint to none when not specified', () => {
    const event = new Event('test');
    populateProperties({
      'myProp': { classification: 'SystemMetaData', purpose: 'FeatureInsight' }
    }, event, true);
    const prop = event.properties[0] as Property;
    assert.strictEqual(prop.endPoint, 'none');
  });

  it('sets isMeasurement when specified', () => {
    const event = new Event('test');
    populateProperties({
      'myProp': { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true }
    }, event);
    const prop = event.properties[0] as Property;
    assert.strictEqual(prop.isMeasurement, true);
  });
});
