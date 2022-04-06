// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OutputtedDeclarations } from "./declarations";
import { Property } from "./common-properties";
import { Metadata, Wildcard } from "./events";
import * as keywords from './keywords';

// Converts the declarations array to an object format for easy readability.

export async function transformOutput(output: OutputtedDeclarations): Promise<OutputtedDeclarations> {
    // If there's no events or common properties, we emit a null object
    if (output.events.dataPoints.length === 0 && output.commonProperties.properties.length === 0) {
        return Object.create(null);
    }
    const newEvents = Object.create(null);
    const oldEvents = output.events.dataPoints;
    for (const event of oldEvents) {
        newEvents[event.name] = Object.create(null);
        //We know there won't be anymore includes or inlines because we have resolved them
        for (const property of event.properties as Array<Property | Wildcard | Metadata>) {
            if (property instanceof Wildcard) {
                newEvents[event.name][keywords.wildcard] = newEvents[event.name][keywords.wildcard] ? newEvents[event.name][keywords.wildcard] : [];
                for (const entry of property.entries) {
                    const found = newEvents[event.name][keywords.wildcard].find((e: any) => {
                        return e[keywords.prefix] === entry.prefix.toLowerCase();
                    });
                    if (found) continue;
                    const newEntry = Object.create(null);
                    newEntry[keywords.prefix] = entry.prefix.toLowerCase();
                    if (entry.endpoint) {
                        newEntry[keywords.classification] = { classification: entry.classification.classification, purpose: entry.classification.purpose, endPoint: "none" };
                    } else {
                        newEntry[keywords.classification] = entry.classification;
                    }
                    newEvents[event.name][keywords.wildcard].push(newEntry);
                }
            } else if (property instanceof Property) {
                // Handles the case where the comments can be inconsistent
                // We want to ensure that if isMeasurement is ever flagged it gets propogated
                if (newEvents[event.name][propetyNameChanger(property.name)]) {
                    if (property.isMeasurement) newEvents[event.name][propetyNameChanger(property.name)]['isMeasurement'] = property.isMeasurement;
                    continue;
                }
                newEvents[event.name][propetyNameChanger(property.name)] = { classification: property.classification, purpose: property.purpose };
                if (property.expiration) {
                    newEvents[event.name][propetyNameChanger(property.name)]['expiration'] = property.expiration;
                }
                if (property.owner) {
                    newEvents[event.name][propetyNameChanger(property.name)]['owner'] = property.owner;
                }
                if (property.comment) {
                    newEvents[event.name][propetyNameChanger(property.name)]['comment'] = property.comment;
                }
                if (property.endPoint) {
                    newEvents[event.name][propetyNameChanger(property.name)]['endPoint'] = property.endPoint;
                }
                if (property.isMeasurement) {
                    newEvents[event.name][propetyNameChanger(property.name)]['isMeasurement'] = property.isMeasurement;
                }
            } else {
                // Comments, expiration, and owner metadata are handled here
                newEvents[event.name][propetyNameChanger(property.name)] = property.value;
            }
        }
    }
    const newCommonProperties = Object.create(null);
    const oldCommonProperties = output.commonProperties.properties;
    for (const property of oldCommonProperties) {
        // Handles the case where the comments can be incosistent
        // We want to ensure that if isMeasurement is ever flagged it gets propogated
        if (newCommonProperties[propetyNameChanger(property.name)]) {
            if (property.isMeasurement) newCommonProperties[propetyNameChanger(property.name)]['isMeasurement'] = property.isMeasurement;
            continue;
        }
        newCommonProperties[propetyNameChanger(property.name)] = { classification: property.classification, purpose: property.purpose };
        if (property.endPoint) {
            newCommonProperties[propetyNameChanger(property.name)]['endPoint'] = property.endPoint;
        }
        if (property.isMeasurement) {
            newCommonProperties[propetyNameChanger(property.name)]['isMeasurement'] = property.isMeasurement;
        }
    }
    return { events: newEvents, commonProperties: newCommonProperties };
}

function propetyNameChanger(name: string) {
    name = name.toLowerCase();
    if (name.includes('<number>')) {
        name = name.replace('<number>', '<NUMBER>');
    }
    return name;
}