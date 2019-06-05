// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.i
import { sendEvent, EventData } from "../lib/telemetry";

/* __GDPR__
   "IgnoredEvent" : {
     "property_IEP1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
function sendIgnoredEvent() {
  sendEvent('IgnoredEvent', {
    'property_E1P1': 'property_IEP1_value'
  });
}