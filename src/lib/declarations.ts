// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Fragments } from "./fragments";
import { Events, Include, Inline } from "./events";
import { CommonProperties, Property } from "./common-properties";

export interface Declarations {
    fragments: Fragments;
    events: Events;
    commonProperties: CommonProperties;
}

// We don't output Fragments as they don't really provide much context on their own
export interface OutputtedDeclarations {
    events: Events;
    commonProperties: CommonProperties;
}

function resolveIncludes(target: Events | Fragments, fragments: Fragments) {
    for (const item of target.dataPoints) {
        for (let i = 0; i < item.properties.length; i++) {
            const property = item.properties[i];
            if (property instanceof Include) {
                // Removes the current include from the array since we have filled it in
                item.properties = item.properties.filter((val) => {
                    return val != property;
                });
                for (let reference of property.includeNames) {
                    reference = reference.substring(2, reference.length - 1);
                    const fragment = fragments.dataPoints.find((f) => {
                        return f.name === reference;
                    });
                    if (fragment) item.properties = item.properties.concat(fragment.properties);
                }
            }
        }
    }
    return target;
}

function resolveInlines(target: Events | Fragments, fragments: Fragments) {
    for (const item of target.dataPoints) {
        for (let i = 0; i < item.properties.length; i++) {
            const property = item.properties[i];
            if (property instanceof Inline) {
                // Removes the current inline from the array since we are resolving it
                item.properties = item.properties.filter((val) => {
                    return val !== property;
                });
                for (let reference of property.inlines) {
                    // Gets rid of the ${}
                    reference = reference.substring(2, reference.length - 1);
                    const fragment = fragments.dataPoints.find((f) => {
                        return f.name === reference;
                    });
                    if (fragment) {
                        fragment.properties.forEach((prop) => {
                            if (prop instanceof Property) {
                                // We create the new property in the format inlineName.propName keeping the rest the same
                                let currentProp = new Property(`${property.inlineName}.${prop.name}`, prop.classification, prop.purpose);
                                if (prop.endPoint) {
                                    currentProp.endPoint = prop.endPoint;
                                }
                                if (prop.isMeasurement) {
                                    currentProp.isMeasurement = prop.isMeasurement;
                                }
                                item.properties.push(currentProp);
                            }
                        });
                    }
                }
            }
        }
    }
    return target;
}

export function resolveDeclarations(declarations: Declarations) {
    declarations.fragments = resolveInlines(declarations.fragments, declarations.fragments);
    declarations.events = resolveInlines(declarations.events, declarations.fragments);
    declarations.fragments = resolveIncludes(declarations.fragments, declarations.fragments);
    declarations.events = resolveIncludes(declarations.events, declarations.fragments);
    return {events: declarations.events, commonProperties: declarations.commonProperties, fragments: declarations.fragments};
}