/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLog2 } from "../publicLog";

type IncludedFragment1 = {
    includedProp1: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    includedProp2: { classification: 'CustomerContent', purpose: 'BusinessInsight', isMeasurement: true };
};

type IncludedFragment2 = {
    includedProp3: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    includedProp4: { classification: 'CustomerContent', purpose: 'BusinessInsight', isMeasurement: true };
};

type Event1Classification = {
    prop1: { classification: 'CustomerContent', purpose: 'BusinessInsight' };
    prop2: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
} & IncludedFragment1 & IncludedFragment2;

type SentEvent = {
    prop1: string,
    prop2: string,
    includedProp1: boolean,
    includedProp2: number,
    includedProp3: string,
    includedProp4: number
};
const event: SentEvent = {
    prop1: '',
    prop2: '',
    includedProp1: false,
    includedProp2: -1,
    includedProp3: '-',
    includedProp4: 0
}
publicLog2<SentEvent, Event1Classification>('SentEvent', event);