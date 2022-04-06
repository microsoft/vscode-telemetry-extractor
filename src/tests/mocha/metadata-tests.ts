import assert from "assert";
import path from "path";
import { cwd } from "process";
import { Property } from "../../lib/common-properties";
import { Metadata } from "../../lib/events";
import { Parser } from "../../lib/parser";
import { TsParser } from "../../lib/ts-parser";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
describe('Metadata parsing tests', function () {
  const metadataSources = path.resolve(cwd(), 'src/tests/mocha/resources/source-3/');

  it('TS Parser metadata extraction', () => {
    const tsParser = new TsParser(metadataSources, [], true, false);
    const declarations = tsParser.parseFiles();
    // Test that event with properties and metadata is extracted properly
    assert.ok(declarations['testEvent']);
    assert.strictEqual(declarations['testEvent']['owner'], 'lramos15');
    assert.strictEqual(declarations['testEvent']['comment'], 'event');
    assert.strictEqual(declarations['testEvent']['expiration'], '1.2.3');
    assert.ok(declarations['testEvent']['testproperty']);
    assert.strictEqual(declarations['testEvent']['testproperty']['comment'], 'property');
    assert.ok(declarations['testEvent']['testproperty']['classification']);
    assert.ok(declarations['testEvent']['testproperty']['purpose']);

    // Test that event with no properties and metadata is extracted properly
    assert.ok(declarations['testEventNoProp']);
    assert.strictEqual(declarations['testEventNoProp']['owner'], 'lramos15');
    assert.strictEqual(declarations['testEventNoProp']['comment'], 'event without props');
    assert.strictEqual(declarations['testEventNoProp']['expiration'], '3.2.1');

    // Test that event with properties and no metadata is extracted properly
    assert.ok(declarations['testEventNoMetadata']);
    assert.ok(declarations['testEventNoMetadata']['testproperty']['classification']);
    assert.ok(declarations['testEventNoMetadata']['testproperty']['purpose']);
    assert.ok(!declarations['testEventNoMetadata']['owner']);
  });

  it('GDPR Comment metadata extraction', async () => {
    const parser = new Parser([metadataSources], [], false, false);
    const declarations = await parser.extractDeclarations();
    assert.strictEqual(declarations.events.dataPoints.length, 3);

    // Event with properties and metadata is extracted properly
    assert.strictEqual(declarations.events.dataPoints[0].name, 'testEvent');
    assert.strictEqual(declarations.events.dataPoints[0].properties.length, 4);
    let currentEventProps = declarations.events.dataPoints[0].properties;
    assert.deepStrictEqual(currentEventProps[0], new Property('testProperty', 'SystemMetaData', 'FeatureInsight', undefined, undefined, 'property'));
    assert.deepStrictEqual(currentEventProps[1], new Metadata('owner', 'lramos15'));
    assert.deepStrictEqual(currentEventProps[2], new Metadata('comment', 'event'));
    assert.deepStrictEqual(currentEventProps[3], new Metadata('expiration', '1.2.3'));

    // Event without properties and metadata is extracted properly
    assert.strictEqual(declarations.events.dataPoints[1].name, 'testEventNoProp');
    assert.strictEqual(declarations.events.dataPoints[1].properties.length, 3);
    currentEventProps = declarations.events.dataPoints[1].properties;
    assert.deepStrictEqual(currentEventProps[0], new Metadata('owner', 'lramos15'));
    assert.deepStrictEqual(currentEventProps[1], new Metadata('comment', 'eventNoProp'));
    assert.deepStrictEqual(currentEventProps[2], new Metadata('expiration', '3.2.1'));

    // Event with properties and without metadata is extracted properly
    assert.strictEqual(declarations.events.dataPoints[2].name, 'testEventNoMetadata');
    assert.strictEqual(declarations.events.dataPoints[2].properties.length, 1);
    currentEventProps = declarations.events.dataPoints[2].properties;
    assert.deepStrictEqual(currentEventProps[0], new Property('testProperty', 'SystemMetaData', 'FeatureInsight', undefined, undefined, 'propertyNoMetadata'));
  });
});