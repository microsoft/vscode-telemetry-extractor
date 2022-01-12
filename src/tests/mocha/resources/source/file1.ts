// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { sendEvent, EventData } from "./lib/telemetry";


/* __GDPR__
   "E1" : {
     "property_E1P1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
     "property_E1P2": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
     "property_E1P3": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "expiration": "1.57.0", "owner": "lramos15", "comment": "Test event" },
     "measurement_E1M1": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
     "measurement_E1M<NUMBER>": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
   }
 */
function sendEventE1() {
  sendEvent('E1', {
    'property_E1P1': 'property_E1P1_value',
    'property_E1P2': 'property_E1P2_value',
    'property_E1P3': 'property_E1P3_value',
    'measurement_E1M1': 'measurement_E1M1_value',
    // testing the case of convering numbers in property/measure names to '<NUMBER>'
    'measurement_E1M2': 'measurement_E1M1_value'
  });
}