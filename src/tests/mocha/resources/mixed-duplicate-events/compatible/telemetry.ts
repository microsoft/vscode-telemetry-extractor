import { publicLog2 } from '../../tsparser-tests/publicLog';

type MixedEventClassification = {
    owner: 'team-a';
    comment: 'Declared by a comment and by a publicLog2 call.';
    fromCall: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Only declared by the call.' };
    shared: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Declared by both.' };
};

type MixedEvent = {
    fromCall: boolean | undefined;
    shared: string;
};

publicLog2<MixedEvent, MixedEventClassification>('MixedEvent', { fromCall: true, shared: '' });
