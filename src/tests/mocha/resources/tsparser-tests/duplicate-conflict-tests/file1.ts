import { publicLog2 } from '../publicLog';

type DuplicateTsEventClassification1 = {
  sample: { classification: 'SystemMetaData', purpose: 'FeatureInsight', owner: 'team-a' };
};

type DuplicateTsEventPayload1 = {
  sample: string;
};

publicLog2<DuplicateTsEventPayload1, DuplicateTsEventClassification1>('DuplicateTsEvent', { sample: 'a' });
