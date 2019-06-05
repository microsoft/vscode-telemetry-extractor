// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { sendEvent, EventData } from "./lib/telemetry";
import { createF1, createF2 } from './folderA/fileA1';
import { createF6 } from './folderB/fileB2'

/* __GDPR__
   "E2" : {
     "property_E2P1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
     "property_E2P2": { "${inline}": [ "${F1}", "${F2}" ] },
     "${include}": [ "${F6}" ]
   }
 */
function sendEventE2() {
    sendEvent('E2', {
        'property_E2P1': 'property_E2P1_value',
        'property_E2P2': {
            ...createF1(),
            ...createF2()
        },
        ...createF6()
    });
}


function createDynamic(max) {
    const members = Math.floor(Math.random() * Math.floor(max));
    let dynamic = {};
    for(let m = 1; m <= members; m++) {
        dynamic[`property_${m}`] = `property_${m}_value`;
    }
    return dynamic;
}

/* __GDPR__
   "E3" : {
      "property_E3P1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
function sendEventE3() {
    sendEvent('E3', {
        'property_E3P1' : 'property_E3P1_value',
        'property_E3P2' : createDynamic(21)
    });
}