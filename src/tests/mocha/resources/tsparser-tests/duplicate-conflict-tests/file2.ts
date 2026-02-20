import { publicLog2 } from '../publicLog';

type DuplicateTsEventClassification2 = {
  sample: { classification: 'SystemMetaData', purpose: 'FeatureInsight', owner: 'team-b' };
};

type DuplicateTsEventPayload2 = {
  sample: string;
};

publicLog2<DuplicateTsEventPayload2, DuplicateTsEventClassification2>('DuplicateTsEvent', { sample: 'b' });
