// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Parser } from "../../lib/parser";
import * as assert from 'assert';
import * as assertHelper from './assert-helper';
import * as path from 'path';
import { cwd } from "process";
import { Property } from "../../lib/common-properties";

const sourceDir = path.join(cwd(), 'src/tests/mocha/resources/');
const excludeDirs = [path.join(sourceDir, 'source'), path.join(sourceDir, 'source-1')];

describe('GDPR common property extraction', () => {
  it('find files', function () {
    const parser = new Parser([sourceDir], excludeDirs, true, false);
    //@ts-ignore
    const filePaths = parser.findFilesWithCommonProperties(sourceDir);
    assertHelper.sameValues(filePaths, [path.join(cwd(), '/src/tests/mocha/resources/common-prop.ts')]);
  });

  it('extract declarations', function () {
    const parser = new Parser([sourceDir], excludeDirs, true, false);
    //@ts-ignore
    const commonProperties = parser.findCommonProperties(sourceDir);
    assert.deepStrictEqual(commonProperties.properties[0], new Property('timestamp', 'SystemMetaData', 'FeatureInsight', undefined, undefined, undefined, 'none'));
    assert.deepStrictEqual(commonProperties.properties[1], new Property('machineid', 'EndUserPseudonymizedInformation', 'FeatureInsight', undefined, undefined, undefined, 'MacAddressHash'));
  });
});
