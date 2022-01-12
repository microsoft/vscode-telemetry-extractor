/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLog2 } from '../publicLog';

type SmallEvent1Classifcation = {
    foo: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    bar: { classification: 'CallstackOrException', purpose: 'PerformanceAndHealth', isMeasurement: true };
    baz: { classification: 'SystemMetaData', purpose: 'FeatureInsight', expiration: '1.57.0', owner: "lramos15", comment: "Test event" };
};

type SmallEvent1Event = {
    foo: string;
    bar: number;
    baz: string;
};

publicLog2<SmallEvent1Event, SmallEvent1Classifcation>('SmallEvent1', { foo: 'foo', bar: 0, baz: 'test' });

type SmallEvent2Classification = {
    superExtraLongPropertyNameThatIsPointless: { classification: 'PublicNonPersonalData', purpose: 'BusinessInsight' };
    ''?: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

type SmallEvent2Event = {
    superExtraLongPropertyNameThatIsPointless: string;
    ''?: boolean;
};

publicLog2<SmallEvent2Event, SmallEvent2Classification>('SmallEvent2', { superExtraLongPropertyNameThatIsPointless: '' });
