// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { EventData } from '../lib/telemetry';

/* __GDPR__FRAGMENT__
   "F0" : {
      "property_F0P1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "property_F0P2": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
export function createF0(data: EventData): EventData {
    return {
        property_F1P1: 'property_F1P1_value',
        property_F1P2: 'property_F1P2_value'
    };
}

/* __GDPR__FRAGMENT__
   "F1" : {
      "property_F1P1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "property_F1P2": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
export function createF1(): EventData {
    return {
        property_F1P1: 'property_F1P1_value',
        property_F1P2: 'property_F1P2_value'
    };
}

/* __GDPR__FRAGMENT__
   "F2" : {
      "property_F2P1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "property_F2P2": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
export function createF2(): EventData {
    return {
        property_F2P1: 'property_F2P1_value',
        property_F2P2: 'property_F2P2_value'
    };
}

/* __GDPR__FRAGMENT__
   "F3" : {
      "property_F3P1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "property_F3P2": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
export function createF3(): EventData {
    return {
        property_F3P1: 'property_F3P1_value',
        property_F3P2: 'property_F3P2_value'
    };
}