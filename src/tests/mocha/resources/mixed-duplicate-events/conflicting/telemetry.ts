import { publicLog2 } from '../../tsparser-tests/publicLog';

type MixedConflictEventClassification = {
    owner: 'team-a';
    comment: 'Declared by a comment and by a publicLog2 call.';
    outcome: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The success state.' };
};

publicLog2<{ outcome: string }, MixedConflictEventClassification>('MixedConflictEvent', { outcome: '' });
