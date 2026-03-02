// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Parser } from "../../lib/parser";
import * as assert from 'assert';
import * as assertHelper from './assert-helper';
import * as path from 'path';
import { cwd } from "process";
import { Property, ColumnType, ColumnInfo } from "../../lib/common-properties";

const sourceDir = path.join(cwd(), 'src/tests/mocha/resources/');
const excludeDirs = [path.join(sourceDir, 'source'), path.join(sourceDir, 'source-1')];

describe('GDPR common property extraction', () => {
  it('find files', function () {
    const parser = new Parser([sourceDir], excludeDirs, true, false);
    //@ts-expect-error accessing private method for testing
    const filePaths = parser.findFilesWithCommonProperties(sourceDir);
    assertHelper.sameValues(filePaths, [path.join(cwd(), '/src/tests/mocha/resources/common-prop.ts')]);
  });

  it('extract declarations', function () {
    const parser = new Parser([sourceDir], excludeDirs, true, false);
    //@ts-expect-error accessing private method for testing
    const commonProperties = parser.findCommonProperties(sourceDir);
    assert.deepStrictEqual(commonProperties.properties[0], new Property('timestamp', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
    assert.deepStrictEqual(commonProperties.properties[1], new Property('machineid', 'EndUserPseudonymizedInformation', 'FeatureInsight', undefined, undefined, undefined, 'MacAddressHash'));
  });
});

describe('ColumnType', () => {
  it('parses canonical type names', () => {
    const canonicalTypes: ColumnType[] = ['bool', 'int', 'long', 'real', 'decimal', 'dynamic', 'guid', 'string', 'datetime', 'timespan'];
    for (const type of canonicalTypes) {
      assert.strictEqual(ColumnType.fromString(type), type);
    }
  });

  it('parses alias type names to canonical form', () => {
    assert.strictEqual(ColumnType.fromString('boolean'), 'bool');
    assert.strictEqual(ColumnType.fromString('double'), 'real');
    assert.strictEqual(ColumnType.fromString('uuid'), 'guid');
    assert.strictEqual(ColumnType.fromString('uniqueid'), 'guid');
    assert.strictEqual(ColumnType.fromString('date'), 'datetime');
    assert.strictEqual(ColumnType.fromString('time'), 'timespan');
  });

  it('is case-insensitive', () => {
    assert.strictEqual(ColumnType.fromString('String'), 'string');
    assert.strictEqual(ColumnType.fromString('BOOL'), 'bool');
    assert.strictEqual(ColumnType.fromString('DateTime'), 'datetime');
    assert.strictEqual(ColumnType.fromString('BOOLEAN'), 'bool');
    assert.strictEqual(ColumnType.fromString('Double'), 'real');
  });

  it('returns undefined for unknown types', () => {
    assert.strictEqual(ColumnType.fromString('unknown'), undefined);
    assert.strictEqual(ColumnType.fromString('varchar'), undefined);
    assert.strictEqual(ColumnType.fromString(''), undefined);
    assert.strictEqual(ColumnType.fromString('number'), undefined);
  });
});

describe('ColumnInfo', () => {
  it('validates a complete column info with name and type', () => {
    assert.strictEqual(ColumnInfo.is({ name: 'Duration', type: 'real' }), true);
    assert.strictEqual(ColumnInfo.is({ name: 'Outcome', type: 'string' }), true);
  });

  it('validates column info without name (name is optional)', () => {
    assert.strictEqual(ColumnInfo.is({ type: 'long' }), true);
    assert.strictEqual(ColumnInfo.is({ type: 'bool' }), true);
  });

  it('accepts alias type names', () => {
    assert.strictEqual(ColumnInfo.is({ name: 'Active', type: 'boolean' }), true);
    assert.strictEqual(ColumnInfo.is({ name: 'Latency', type: 'double' }), true);
    assert.strictEqual(ColumnInfo.is({ name: 'Id', type: 'uuid' }), true);
    assert.strictEqual(ColumnInfo.is({ name: 'Start', type: 'date' }), true);
    assert.strictEqual(ColumnInfo.is({ name: 'Elapsed', type: 'time' }), true);
  });

  it('rejects invalid type', () => {
    assert.strictEqual(ColumnInfo.is({ name: 'Foo', type: 'varchar' }), false);
    assert.strictEqual(ColumnInfo.is({ name: 'Foo', type: '' }), false);
  });

  it('rejects missing type', () => {
    assert.strictEqual(ColumnInfo.is({ name: 'Foo' }), false);
    assert.strictEqual(ColumnInfo.is({}), false);
  });

  it('rejects non-string name', () => {
    assert.strictEqual(ColumnInfo.is({ name: 123, type: 'string' }), false);
  });

  it('rejects null and undefined', () => {
    assert.strictEqual(ColumnInfo.is(null), false);
    assert.strictEqual(ColumnInfo.is(undefined), false);
  });
});

describe('Property with column info', () => {
  it('has no column by default', () => {
    const prop = new Property('duration', 'SystemMetaData', 'PerformanceAndHealth');
    assert.strictEqual(prop.column, undefined);
  });

  it('can be assigned a column', () => {
    const prop = new Property('duration', 'SystemMetaData', 'PerformanceAndHealth');
    prop.column = { name: 'Duration', type: 'real' };
    assert.strictEqual(prop.column.name, 'Duration');
    assert.strictEqual(prop.column.type, 'real');
  });

  it('can have a column without a name', () => {
    const prop = new Property('outcome', 'SystemMetaData', 'FeatureInsight');
    prop.column = { type: 'string' };
    assert.strictEqual(prop.column.name, undefined);
    assert.strictEqual(prop.column.type, 'string');
  });
});

