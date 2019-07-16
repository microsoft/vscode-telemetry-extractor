/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLog2 } from "../publicLog";

type IncludedFragment = {
    includedProp1: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    includedProp2: { classification: 'CustomerContent', purpose: 'BusinessInsight', isMeasurement: true };
};

type Event1Classification = {
    prop1: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    prop2: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
} & IncludedFragment;

type Event1 = {
    prop1: string;
    prop2: object;
    includedProp1: string;
    includedProp2: number;
};

const sentEvent: Event1 = {
    prop1: 'foo',
    prop2: {},
    includedProp1: 'bar',
    includedProp2: 0
};

publicLog2<Event1, Event1Classification>('Event1', sentEvent);