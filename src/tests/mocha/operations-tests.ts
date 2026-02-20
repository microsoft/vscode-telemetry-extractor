// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import * as path from 'path';
import { makeExclusionsRelativeToSource, merge, findOrCreate, populateProperties } from '../../lib/operations';
import { Events, Event, Include, Inline, Metadata } from '../../lib/events';
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

  it('keeps first definition for overlapping events with different properties', () => {
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
    assert.strictEqual(target.dataPoints[0].properties.length, 1);
    assert.deepStrictEqual(target.dataPoints[0].properties[0], e1.properties[0]);
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

  it('does not append conflicting overlapping events', () => {
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
