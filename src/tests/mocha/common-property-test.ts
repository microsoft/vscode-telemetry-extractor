import { Parser } from "../../lib/parser";
import * as assert from 'assert';
import * as assertHelper from './assert-helper';
import * as path from 'path';
import { cwd } from "process";
import { Property } from "../../lib/common-properties";

const sourceDir = 'src/tests/mocha/resources/';
const excludeDirs = ['source', 'source-1'];

describe.only('GDPR common property extraction', () => {
  it('find files', function () {
    const parser = new Parser([path.join(cwd(), sourceDir)], excludeDirs, true, true);
    //@ts-ignore
    const filePaths = parser.findFilesWithCommonProperties(path.join(cwd(), sourceDir));
    assertHelper.sameValues(filePaths, [path.join(cwd(), '/src/tests/mocha/resources/common-prop.ts')]);
  });

  it('extract declarations', function () {
    const parser = new Parser([path.join(cwd(), sourceDir)], excludeDirs, true, true);
    //@ts-ignore
    const commonProperties = parser.findCommonProperties(path.join(cwd(), sourceDir));
    assert.deepStrictEqual(commonProperties.properties[0], new Property('timestamp', 'SystemMetaData', 'FeatureInsight', 'none'));
    assert.deepStrictEqual(commonProperties.properties[1], new Property('machineid', 'EndUserPseudonymizedInformation', 'FeatureInsight', 'MacAddressHash'));
  });
});
