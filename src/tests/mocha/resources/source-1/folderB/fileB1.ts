// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { EventData } from '../lib/telemetry';
import { createF1, createF2, createF3 } from '../folderA/fileA1';

/* __GDPR__FRAGMENT__
   "F4" : {
      "property_F4P1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "${include}" : [ "${F1}", "${F2}" ]
   }
 */
export function createF4(): EventData {
    return {
        property_F4P1: 'property_F4P1_value',
        ...createF1(),
        ...createF2()
    }
}

/* __GDPR__FRAGMENT__
   "F5" : {
      "property_F5P1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "property_F5P2" : { "${inline}": [ "${F2}", "${F3}" ]}
   }
 */
export function createF5(): EventData {
    return {
        property_F5P1: 'property_F5P1_value',
        property_F5P2: {
            ...createF2(),
            ...createF3()
        }
    }
}