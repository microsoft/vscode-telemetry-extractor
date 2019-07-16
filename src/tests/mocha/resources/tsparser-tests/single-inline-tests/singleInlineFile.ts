// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { publicLog2 } from "../publicLog";

type InlineClassification = {
    inlineProp1: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
    inlineProp2: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};
type SingleEventClassification = {
    inline: InlineClassification;
    prop1: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

type InlineEvent = {
    inlineProp1: string;
    inlineProp2: string;
};

type SingleEvent = {
    inline: InlineEvent;
    prop1: string;
};

const inlineEvent = {
    inlineProp1: '',
    inlineProp2: 'foo'
};

const singleEvent: SingleEvent = {
    inline: inlineEvent,
    prop1: 'bar'
};

publicLog2<SingleEvent, SingleEventClassification>('SingleInline', singleEvent);

