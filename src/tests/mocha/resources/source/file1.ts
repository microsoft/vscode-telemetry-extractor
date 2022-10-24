// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { sendEvent, EventData } from "./lib/telemetry";


/* __GDPR__
   "EOne" : {
     "property_EOneP1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
     "property_EOneP2": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
     "property_EOneP3": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "expiration": "1.57.0", "owner": "lramos15", "comment": "Test event" },
     "measurement_EOneM1": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
     "measurement_EOneM<NUMBER>": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
   }
 */
function sendEventEOne() {
  sendEvent('EOne', {
    'property_EOneP1': 'property_EOneP1_value',
    'property_EOneP2': 'property_EOneP2_value',
    'property_EOneP3': 'property_EOneP3_value',
    'measurement_EOneM1': 'measurement_EOneM1_value',
    // testing the case of convering numbers in property/measure names to '<NUMBER>'
    'measurement_EOneM2': 'measurement_EOneM1_value'
  });
}