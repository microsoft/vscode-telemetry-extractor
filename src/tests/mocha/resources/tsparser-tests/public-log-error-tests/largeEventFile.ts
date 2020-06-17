/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLogError2 } from "../publicLog";

type LargeEventclassification = {
    prop1: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop2: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop3: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop4: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop5: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop6: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop7: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop8: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop9: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop10: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop11: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop12: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop13: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop14: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop15: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop16: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop17: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop18: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop19: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop20: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop21: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop22: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop23: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop24: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop25: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop26: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop27: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop28: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop29: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop30: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop31: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop32: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop33: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop34: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop35: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop36: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop37: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop38: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop39: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop40: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop41: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop42: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop43: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop44: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop45: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop46: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop47: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop48: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop49: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop50: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

type LargeEvent = {
    prop1: string;
    prop2: string;
    prop3: string;
    prop4: string;
    prop5: string;
    prop6: string;
    prop7: string;
    prop8: string;
    prop9: string;
    prop10: string;
    prop11: string;
    prop12: string;
    prop13: string;
    prop14: string;
    prop15: string;
    prop16: string;
    prop17: string;
    prop18: string;
    prop19: string;
    prop20: string;
    prop21: string;
    prop22: string;
    prop23: string;
    prop24: string;
    prop25: string;
    prop26: string;
    prop27: string;
    prop28: string;
    prop29: string;
    prop30: string;
    prop31: string;
    prop32: string;
    prop33: string;
    prop34: string;
    prop35: string;
    prop36: string;
    prop37: string;
    prop38: string;
    prop39: string;
    prop40: string;
    prop41: string;
    prop42: string;
    prop43: string;
    prop44: string;
    prop45: string;
    prop46: string;
    prop47: string;
    prop48: string;
    prop49: string;
    prop50: string;
}

const largeEvent: LargeEvent = {
    prop1: 'FooBar',
    prop2: 'FooBar',
    prop3: 'FooBar',
    prop4: 'FooBar',
    prop5: 'FooBar',
    prop6: 'FooBar',
    prop7: 'FooBar',
    prop8: 'FooBar',
    prop9: 'FooBar',
    prop10: 'FooBar',
    prop11: 'FooBar',
    prop12: 'FooBar',
    prop13: 'FooBar',
    prop14: 'FooBar',
    prop15: 'FooBar',
    prop16: 'FooBar',
    prop17: 'FooBar',
    prop18: 'FooBar',
    prop19: 'FooBar',
    prop20: 'FooBar',
    prop21: 'FooBar',
    prop22: 'FooBar',
    prop23: 'FooBar',
    prop24: 'FooBar',
    prop25: 'FooBar',
    prop26: 'FooBar',
    prop27: 'FooBar',
    prop28: 'FooBar',
    prop29: 'FooBar',
    prop30: 'FooBar',
    prop31: 'FooBar',
    prop32: 'FooBar',
    prop33: 'FooBar',
    prop34: 'FooBar',
    prop35: 'FooBar',
    prop36: 'FooBar',
    prop37: 'FooBar',
    prop38: 'FooBar',
    prop39: 'FooBar',
    prop40: 'FooBar',
    prop41: 'FooBar',
    prop42: 'FooBar',
    prop43: 'FooBar',
    prop44: 'FooBar',
    prop45: 'FooBar',
    prop46: 'FooBar',
    prop47: 'FooBar',
    prop48: 'FooBar',
    prop49: 'FooBar',
    prop50: 'FooBar'
};
publicLogError2<LargeEvent, LargeEventclassification>('LargeEvent', largeEvent);