import { OutputtedDeclarations } from "./declarations";
import { Property } from "./common-properties";
import { Wildcard } from "./events";
import * as keywords from './keywords';
import { options } from "../cli-options";

// Converts the declarations array to an object format for easy readability.

export async function transformOutput(output: OutputtedDeclarations): Promise<OutputtedDeclarations> {
    const newEvents = Object.create(null);
    const oldEvents = output.events.dataPoints;
    for (const event of oldEvents) {
        newEvents[event.name] = Object.create(null);
        //We know there won't be anymore includes or inlines because we have resolved them
        for (const property of event.properties as Array<Property | Wildcard>) {
            if (property instanceof Wildcard) {
                newEvents[event.name][keywords.wildcard] = newEvents[event.name][keywords.wildcard] ? newEvents[event.name][keywords.wildcard] : [];
                for (const entry of property.entries) {
                    const found = newEvents[event.name][keywords.wildcard].find((e: any) => {
                        return e[keywords.prefix] === entry.prefix;
                    });
                    if (found) continue;
                    const newEntry = Object.create(null);
                    newEntry[keywords.prefix] = entry.prefix;

                    if (options.applyEndpoints) {
                        newEntry[keywords.classification] = {classification: entry.classification.classification, purpose: entry.classification.purpose, endPoint: "none"};
                    } else {
                        newEntry[keywords.classification] = entry.classification;
                    }
                    newEvents[event.name][keywords.wildcard].push(newEntry);
                }
            }else {
                // Handles the case where the comments can be incosistent
                // We want to ensure that if isMeasurement is ever flagged it gets propogated
                if (newEvents[event.name][propetyNameChanger(property.name)]) {
                    if (property.isMeasurement) newEvents[event.name][propetyNameChanger(property.name)]['isMeasurement'] = property.isMeasurement;
                    continue;
                }
                newEvents[event.name][propetyNameChanger(property.name)] = {classification: property.classification, purpose: property.purpose};
                if (property.endPoint) {
                    newEvents[event.name][propetyNameChanger(property.name)]['endPoint'] = property.endPoint;
                }
                if (property.isMeasurement) {
                    newEvents[event.name][propetyNameChanger(property.name)]['isMeasurement'] = property.isMeasurement;
                }
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
        newCommonProperties[propetyNameChanger(property.name)] = {classification: property.classification, purpose: property.purpose};
        if (property.endPoint) {
            newCommonProperties[propetyNameChanger(property.name)]['endPoint'] = property.endPoint;
        }
        if (property.isMeasurement) {
            newCommonProperties[propetyNameChanger(property.name)]['isMeasurement'] = property.isMeasurement;
        }
    }
    return {events: newEvents, commonProperties: newCommonProperties};
}

function propetyNameChanger(name: string) {
    name = name.toLowerCase();
    if (name.includes('<number>')){
        name = name.replace('<number>', '<NUMBER>');
    }
    return name;
}