// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { sendEvent } from "./lib/telemetry";


/* __GDPR__
   "EFour" : {
     "property_EFourP1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
     "property_EFourP2": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
     "property_EFourP3": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "expiration": "1.57.0", "owner": "lramos15", "comment": "Test event" },
     "measurement_EFourM1": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
     "measurement_EFourM<NUMBER>": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
   }
 */
function sendEventEFour() {
  sendEvent('EFour', {
    'property_EFourP1': 'property_EFourP1_value',
    'property_EFourP2': 'property_EFourP2_value',
    'property_EFourP3': 'property_EFourP3_value',
    'measurement_EFourM1': 'measurement_EFourM1_value',
    // testing the case of convering numbers in property/measure names to '<NUMBER>'
    'measurement_EFourM2': 'measurement_EFourM1_value'
  });
}