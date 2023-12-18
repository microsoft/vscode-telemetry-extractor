/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLog2 } from '../publicLog';

type SmallEvent4Classification = {
  'prop1': { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
  prop2: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

type SmallEvent4Event = {
  prop1: number;
  'prop2': number;
};

const testIIFE = (() => {
  publicLog2<SmallEvent4Event, SmallEvent4Classification>('SmallEvent4', { prop1: 0, prop2: 4 });
})();

