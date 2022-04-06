
/* __GDPR__
  "testEvent" : {
    "testProperty" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "property" },
    "owner": "lramos15",
    "comment": "event",
    "expiration": "1.2.3"
  }
*/
console.log('GDPR Comment with metadata and properties');

/* __GDPR__
  "testEventNoProp" : {
    "owner": "lramos15",
    "comment": "eventNoProp",
    "expiration": "3.2.1"
  }
*/
console.log('GDPR Comment with only metadata');

/* __GDPR__
  "testEventNoMetadata" : {
    "testProperty" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "propertyNoMetadata" }
  }
*/
console.log('GDPR Comment wiht no metadata, but with properties');