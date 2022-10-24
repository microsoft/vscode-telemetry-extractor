// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { sendEvent, EventData } from "./lib/telemetry";
import { createF1, createF2 } from './folderA/fileA1';
import { createF6 } from './folderB/fileB2'

/* __GDPR__
   "ETwo" : {
     "property_ETwoP1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
     "property_ETwoP2": { "${inline}": [ "${F1}", "${F2}" ] },
     "${include}": [ "${F6}" ]
   }
 */
function sendEventETwo() {
    sendEvent('ETwo', {
        'property_ETwoP1': 'property_ETwoP1_value',
        'property_ETwoP2': {
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
   "EThree" : {
      "property_EThreeP1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
function sendEventEThree() {
    sendEvent('EThree', {
        'property_EThreeP1' : 'property_EThreeP1_value',
        'property_EThreeP2' : createDynamic(21)
    });
}