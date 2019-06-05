// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { EventData } from '../lib/telemetry';
import { createF4, createF5 } from '../folderB/fileB1';

/* __GDPR__FRAGMENT__
   "F6" : {
        "${include}": [
            "${F4}",
            "${F5}"
        ]
   }
 */
export function createF6(): EventData {
    return {
        ...createF4(),
        ...createF5()
    };
}