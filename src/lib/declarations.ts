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
    const notResolved: Array<String> = [];
    const usedFragments: Array<String> = [];
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
    const notResolved: Array<String> = [];
    const usedFragments: Array<String> = [];
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
                                let currentProp = new Property(`${property.inlineName}.${prop.name}`, prop.classification, prop.purpose, prop.expiration, prop.owner, prop.comment);
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
    let notResolved: Array<String> = [];
    let usedFragments: Array<String> = [];
    if (verbose) {
        const fragmentsResolveInlines = resolveInlines(declarations.fragments, declarations.fragments);
        const eventsResolveInlines = resolveInlines(declarations.events, declarations.fragments);
        const fragmentsResolveIncludes = resolveIncludes(declarations.fragments, declarations.fragments);
        const eventsResolveIncludes = resolveIncludes(declarations.events, declarations.fragments);
        notResolved = notResolved.concat(fragmentsResolveIncludes.notResolved);
        notResolved = notResolved.concat(fragmentsResolveInlines.notResolved);
        notResolved = notResolved.concat(eventsResolveIncludes.notResolved);
        notResolved = notResolved.concat(eventsResolveInlines.notResolved);
        // Remove duplicates
        notResolved = [...new Set(notResolved)];
        usedFragments = usedFragments.concat(fragmentsResolveIncludes.usedFragments);
        usedFragments = usedFragments.concat(fragmentsResolveInlines.usedFragments);
        usedFragments = usedFragments.concat(eventsResolveIncludes.usedFragments);
        usedFragments = usedFragments.concat(eventsResolveInlines.usedFragments);
        // Remove duplicates
        const usedFragmentsSet = new Set(usedFragments);
        const allFragments = declarations.fragments.dataPoints.map(f => f.name);
        // The Symmetric difference of a set
        let unusedFragments = [...new Set(allFragments.filter(x => !usedFragmentsSet.has(x)))];
        notResolved = notResolved.length > 0 ? notResolved : ['None'];
        unusedFragments = unusedFragments.length > 0 ? unusedFragments : ['None'];
        console.log(`Unresolved References: ${notResolved}`);
        console.log(`Unused Fragments: ${unusedFragments}`);
        declarations.fragments = fragmentsResolveInlines.target;
        declarations.events = eventsResolveInlines.target;
        declarations.fragments = fragmentsResolveIncludes.target;
        declarations.events = eventsResolveIncludes.target;
    } else {
        declarations.fragments = resolveInlines(declarations.fragments, declarations.fragments).target;
        declarations.events = resolveInlines(declarations.events, declarations.fragments).target;
        declarations.fragments = resolveIncludes(declarations.fragments, declarations.fragments).target;
        declarations.events = resolveIncludes(declarations.events, declarations.fragments).target;
    }
    return { events: declarations.events, commonProperties: declarations.commonProperties, fragments: declarations.fragments };
}