// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import * as path from 'path';
import { makeExclusionsRelativeToSource, mergeFragments, findOrCreate, populateProperties } from '../../lib/operations';
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

describe('mergeFragments', () => {
  it('merges non-overlapping fragments', () => {
    const target = new Fragments();
    target.dataPoints.push(new Fragment('frag1'));
    const source = new Fragments();
    source.dataPoints.push(new Fragment('frag2'));
    mergeFragments(target, source);
    assert.strictEqual(target.dataPoints.length, 2);
  });

  it('combines the properties of fragments with the same name', () => {
    const target = new Fragments();
    const first = new Fragment('frag');
    first.properties.push(new Property('prop1', 'SystemMetaData', 'FeatureInsight'));
    target.dataPoints.push(first);
    const source = new Fragments();
    const second = new Fragment('frag');
    second.properties.push(new Property('prop2', 'SystemMetaData', 'FeatureInsight'));
    source.dataPoints.push(second);
    mergeFragments(target, source);
    assert.strictEqual(target.dataPoints.length, 1);
    assert.deepStrictEqual(target.dataPoints[0].properties.map(p => (p as Property).name), ['prop1', 'prop2']);
  });

  it('merges empty source into target', () => {
    const target = new Fragments();
    target.dataPoints.push(new Fragment('frag1'));
    mergeFragments(target, new Fragments());
    assert.strictEqual(target.dataPoints.length, 1);
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

  it('returns existing event without appending it again', () => {
    const events = new Events();
    const existing = new Event('existing');
    events.dataPoints.push(existing);
    const result = findOrCreate(events, 'existing');
    assert.strictEqual(result, existing);
    assert.strictEqual(events.dataPoints.length, 1);
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

  it('accepts isMeasurement declared as the string "true"', () => {
    const event = new Event('event');
    populateProperties({ asString: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: 'true' }, asFalse: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: 'false' } }, event);
    assert.deepStrictEqual(event.properties.map(p => (p as Property).isMeasurement), [true, undefined]);
  });
});
