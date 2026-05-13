// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface EventData {
    [property: string]: string | EventData;
}

function addCommonProperties(event: EventData) : EventData {
    // __GDPR__COMMON__ "timestamp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    event.timestamp = 'timestamp_value';
    // __GDPR__COMMON__ "machineid" : { "endPoint": "MacAddressHash", "classification": "EndUserPseudonymizedInformation", "purpose": "FeatureInsight" }
    event.machineid = 'machineid_value';
    return event;
}

function _sendEvent(event: string, data: EventData) {
    // send event
}

export function sendEvent(event: string, data: EventData) : void {
    data = addCommonProperties(data);
    _sendEvent(event, data);
}