// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Fragments } from "./fragments";
import { Events, Include, Inline } from "./events";
import { CommonProperties, Property } from "./common-properties";
import type { ExtractedDeclarations } from "../../vscode-telemetry-extractor";

export interface Declarations {
    fragments: Fragments;
    events: Events;
    commonProperties: CommonProperties;
}

// We don't output Fragments as they don't really provide much context on their own
export type OutputtedDeclarations = ExtractedDeclarations;

function resolveIncludes(target: Events | Fragments, fragments: Fragments) {
    const notResolved: Array<string> = [];
    const usedFragments: Array<string> = [];
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
                    if (fragment) {
                        item.properties = item.properties.concat(fragment.properties);
                        usedFragments.push(fragment.name);
                    } else {
                        notResolved.push(reference);
                    }
                    // This is an inefficient solution, but since adding and removing from the array
                    // messes up the iteration we just restart it until we can get through the whole loop without any includes
                    i = 0;
                }
            }
        }
    }
    return { target, notResolved, usedFragments };
}

function resolveInlines(target: Events | Fragments, fragments: Fragments) {
    const notResolved: Array<string> = [];
    const usedFragments: Array<string> = [];
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
                        usedFragments.push(fragment.name);
                        fragment.properties.forEach((prop) => {
                            if (prop instanceof Property) {
                                // We create the new property in the format inlineName.propName keeping the rest the same
                                const currentProp = new Property(`${property.inlineName}.${prop.name}`, prop.classification, prop.purpose, prop.expiration, prop.owner, prop.comment);
                                if (prop.endPoint) {
                                    currentProp.endPoint = prop.endPoint;
                                }
                                if (prop.isMeasurement) {
                                    currentProp.isMeasurement = prop.isMeasurement;
                                }
                                item.properties.push(currentProp);
                            }
                        });
                    } else {
                        notResolved.push(reference);
                    }
                }
            }
        }
    }
    return { target, notResolved, usedFragments };
}

export function resolveDeclarations(declarations: Declarations, verbose: boolean) {
    // Fragments are resolved in place, first inlines then includes, so later steps see expanded fragments.
    const results = [
        resolveInlines(declarations.fragments, declarations.fragments),
        resolveInlines(declarations.events, declarations.fragments),
        resolveIncludes(declarations.fragments, declarations.fragments),
        resolveIncludes(declarations.events, declarations.fragments)
    ];
    if (verbose) {
        const notResolved = [...new Set(results.flatMap(result => result.notResolved))];
        const usedFragments = new Set(results.flatMap(result => result.usedFragments));
        const unusedFragments = [...new Set(declarations.fragments.dataPoints.map(f => f.name).filter(name => !usedFragments.has(name)))];
        console.log(`Unresolved References: ${notResolved.length > 0 ? notResolved : ['None']}`);
        console.log(`Unused Fragments: ${unusedFragments.length > 0 ? unusedFragments : ['None']}`);
    }
    return { events: declarations.events, commonProperties: declarations.commonProperties, fragments: declarations.fragments };
}
