/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { publicLogError2 } from '../publicLog';

type SmallEvent1Classifcation = {
    foo: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    bar: { classification: 'CallstackOrException', purpose: 'PerformanceAndHealth', isMeasurement: true };
};

type SmallEvent1Event = {
    foo: string;
    bar: number;
};

publicLogError2<SmallEvent1Event, SmallEvent1Classifcation>('SmallEvent1', { foo: 'foo', bar: 0 });

type SmallEvent2Classification = {
    superExtraLongPropertyNameThatIsPointless: { classification: 'PublicNonPersonalData', purpose: 'BusinessInsight' };
    ''?: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

type SmallEvent2Event = {
    superExtraLongPropertyNameThatIsPointless: string;
    ''?: boolean;
};

publicLogError2<SmallEvent2Event, SmallEvent2Classification>('SmallEvent2', { superExtraLongPropertyNameThatIsPointless: '' });
