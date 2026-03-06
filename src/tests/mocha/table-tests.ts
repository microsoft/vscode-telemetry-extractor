// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Parser } from "../../lib/parser";
import * as assert from 'assert';
import { Property, ColumnType, ColumnInfo } from "../../lib/common-properties";
import { cwd } from 'process';
import * as path from 'path';
import { TsParser } from '../../lib/ts-parser';

const sourceDir = path.join(cwd(), 'src/tests/mocha/tableResources/source');

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

describe('Flat table - GDPR Comment', () => {
	it('Parse table instructions', async () => {
		const parser = new Parser([path.join(sourceDir, 'comment')], [], false, false);
		const declarations = await parser.extractDeclarations();
		assert.strictEqual(declarations.events.dataPoints.length, 1);
		const event = declarations.events.dataPoints[0];
		assert.strictEqual(event.name, 'EOne');
		assert.strictEqual(event.tableInfo?.name, 'EOneTable');
		assert.strictEqual(event.tableInfo?.commonProperties, 'standard');
		assert.strictEqual(event.tableInfo?.backfill, false);
		assert.strictEqual(event.properties.length, 3);
		const types: Map<string, string> = new Map([
			['count', 'int'],
			['date', 'datetime'],
			['isValid', 'bool']
		]);
		for (const prop of event.properties) {
			assert.ok(prop instanceof Property);
			const expectedType = types.get(prop.name);
			assert.strictEqual(expectedType, prop.column?.type);
		}
	});
});

describe('Flat table - TS definition', () => {
	it('Parse table instructions', () => {
		const tsParser = new TsParser(path.resolve(sourceDir, 'ts-declaration'), [], true, false);
		const declarations = tsParser.parseFiles();
		const event = declarations['Event1'];
		assert.strictEqual(event.tableInfo?.name, 'monacoworkbench_inlinecompletion.endoflife');
		assert.strictEqual(event.tableInfo?.commonProperties, 'standard');
		assert.strictEqual(event.tableInfo?.backfill, false);
		const columns = new Map([
			['extennsionid', { name: 'extennsionId', type: 'string' }],
			['groupid', { name: 'groupId', type: 'string' }],
		]);
	});
});