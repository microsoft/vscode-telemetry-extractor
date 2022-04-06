import { publicLog2, publicLogError2 } from "./publicLog";

type TestEventClassification = {
  testProperty: { classification: 'SystemMetaData'; purpose: 'FeatureInsight', comment: 'property' };
  owner: 'lramos15';
  comment: 'event';
  expiration: '1.2.3';
};

type TestEvent = {
  testProperty: string;
};

publicLog2<TestEvent, TestEventClassification>('testEvent', {
  testProperty: 'testProperty',
});

type TestEventNoPropClassification = {
  owner: 'lramos15';
  comment: 'event without props';
  expiration: '3.2.1';
};

type TestEventNoProp = {};

publicLog2<TestEventNoProp, TestEventNoPropClassification>('testEventNoProp', {});

type TestEventNoMetadataClassification = {
  testProperty: { classification: 'SystemMetaData'; purpose: 'FeatureInsight' };
};

type TestEventNoMetadata = {
  testProperty: string;
};

publicLogError2<TestEventNoMetadata, TestEventNoMetadataClassification>('testEventNoMetadata', {
  testProperty: 'testProperty',
});