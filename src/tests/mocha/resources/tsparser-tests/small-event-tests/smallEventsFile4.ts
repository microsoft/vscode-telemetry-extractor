/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLog2 } from '../publicLog';

enum SmallEvent5Enum {
  Value1,
  Value2,
  Value3
}

enum SmallEvent5StringEnum {
  Value1 = "Value1",
  Value2 = "Value2",
  Value3 = "Value3"
}

type SmallEvent5Classification = {
  'prop1': { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
  prop2: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

type SmallEvent5Event = {
  prop1: SmallEvent5Enum;
  'prop2': SmallEvent5StringEnum;
};

publicLog2<SmallEvent5Event, SmallEvent5Classification>('SmallEvent5', { prop1: SmallEvent5Enum.Value1, prop2: SmallEvent5StringEnum.Value1 });

