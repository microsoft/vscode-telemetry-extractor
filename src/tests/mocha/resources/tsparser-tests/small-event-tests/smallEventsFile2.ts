/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLog2 } from '../publicLog';

type SmallEvent3Classification = {
    'prop1': { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop2: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

type SmallEvent3Event = {
    prop1: number;
    'prop2': number;
};

publicLog2<SmallEvent3Event, SmallEvent3Classification>('SmallEvent3', { prop1: 0, prop2: 4 });