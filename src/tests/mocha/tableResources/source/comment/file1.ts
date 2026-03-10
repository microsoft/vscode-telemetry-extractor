// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { sendEvent, EventData } from "../lib/telemetry";


/* __GDPR__
   "EOne" : {
     "$tableInfo": { "name": "EOneTable", "commonProperties": "standard", "backfill": false },
     "count": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "type": "int" },
     "date": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "type": "datetime" },
     "isValid": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "type": "bool" }
   }
 */
function sendEventEOne() {
  sendEvent('EOne', {
    'count': '10',
    'date': '2024-06-05T12:34:56Z',
    'isValid': 'true'
  });
}