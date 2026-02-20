// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Fragments, Fragment } from "./fragments";
import { Events, Event, Include, Inline, Wildcard, WildcardEntry, Metadata } from "./events";
import { Property } from "./common-properties";
import * as keywords from './keywords';
import * as path from 'path';

export function merge(target: Fragments | Events, source: Fragments | Events) {
    for (const item of source.dataPoints) {
        const found = target.dataPoints.find((f) => {
            return f.name == item.name;
        });
        // We combine their properties together if the event already exists
        if (found) {
            if (target instanceof Events && source instanceof Events && found instanceof Event && item instanceof Event) {
                if (!sameEventDefinition(found, item)) {
                    throw new Error(`Duplicate telemetry event declaration '${item.name}' has conflicting details.`);
                }
                continue;
            }
            found.properties = found.properties.concat(item.properties);
        } else {
            target.dataPoints.push(item);
        }
    }
}

function sameEventDefinition(left: Event, right: Event) {
    return stableSerialize(eventToComparable(left)) === stableSerialize(eventToComparable(right));
}

function eventToComparable(event: Event) {
    const properties = event.properties.map(propertyToComparable);
    properties.sort((a, b) => stableSerialize(a).localeCompare(stableSerialize(b)));
    return {
        name: event.name,
        properties
    };
}

function propertyToComparable(property: Property | Metadata | Include | Inline | Wildcard) {
    if (property instanceof Property) {
        return {
            type: 'property',
            name: property.name,
            classification: property.classification,
            purpose: property.purpose,
            expiration: property.expiration,
            owner: property.owner,
            comment: property.comment,
            endPoint: property.endPoint,
            isMeasurement: property.isMeasurement
        };
    }
    if (property instanceof Metadata) {
        return {
            type: 'metadata',
            name: property.name,
            value: property.value
        };
    }
    if (property instanceof Include) {
        return {
            type: 'include',
            includeNames: [...property.includeNames].sort()
        };
    }
    if (property instanceof Inline) {
        return {
            type: 'inline',
            inlineName: property.inlineName,
            inlines: [...property.inlines].sort()
        };
    }
    return {
        type: 'wildcard',
        entries: property.entries.map(entry => ({
            prefix: entry.prefix,
            classification: entry.classification,
            endpoint: entry.endpoint
        })).sort((a, b) => stableSerialize(a).localeCompare(stableSerialize(b)))
    };
}

function stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(stableSerialize).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`);
        return `{${entries.join(',')}}`;
    }

    return JSON.stringify(value);
}

// Searches the object for an event or fragment of the specific name 
// If found returns, if not found creates it, places it in the array, and then returns
export function findOrCreate(searchTarget: Events | Fragments, name: string) {
    let found = searchTarget.dataPoints.find((item) => {
        return item.name === name;
    });
    if (!found) {
        if (searchTarget instanceof Events) {
            found = new Event(name);
        } else {
            found = new Fragment(name);
        }
    }
    searchTarget.dataPoints.push(found);
    return found;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeWildcards(wildcard: any[], target: Event | Fragment, applyEndpoints: boolean) {
    let wildCard = target.properties.find((item) => {
        return item instanceof Wildcard;
    }) as Wildcard;
    // if we don't have a wildcard yet we make one
    if (!wildCard) {
        wildCard = new Wildcard();
        target.properties.push(wildCard);
    }
    wildcard.forEach(w => {
        if (applyEndpoints) {
            wildCard.entries.push(new WildcardEntry(w[keywords.prefix], w[keywords.classification], 'none'));
        } else {
            wildCard.entries.push(new WildcardEntry(w[keywords.prefix], w[keywords.classification]));
        }
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function populateProperties(properties: any, target: Event | Fragment, applyEndpoints = false) {
    for (const propertyName in properties) {
        const currentProperty = properties[propertyName];
        if (propertyName === keywords.include) {
            target.properties.push(new Include(currentProperty));
        } else if (currentProperty[keywords.inline]) {
            // We consider the property name the inline name so when we resolve we can do prop.Inline for the new properties
            target.properties.push(new Inline(propertyName, currentProperty[keywords.inline]));
        } else if (propertyName === keywords.wildcard) {
            mergeWildcards(currentProperty, target, applyEndpoints);
        } else if (propertyName === 'owner' || propertyName === 'comment' || propertyName === 'expiration') {
            // This is the special case when the property name matches one of our metadata properties
            target.properties.push(new Metadata(propertyName, currentProperty));
        } else {
            const prop = new Property(propertyName, currentProperty.classification, currentProperty.purpose, currentProperty.expiration, currentProperty.owner, currentProperty.comment);
            if (applyEndpoints) {
                const endpoint = currentProperty.endpoint ? currentProperty.endpoint : 'none';
                prop.endPoint = endpoint;
            }
            if (currentProperty.isMeasurement) {
                prop.isMeasurement = currentProperty.isMeasurement;
            }
            target.properties.push(prop);
        }
    }
}

export function makeExclusionsRelativeToSource(sourceDir: string, excludedDirs: string[]) {
    const relativeExclusions = [];
    for (const excluded of excludedDirs) {
        const rel = path.relative(sourceDir, excluded);
        // Only include if the excluded dir is actually under sourceDir
        if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
            // Normalize to forward slashes for ripgrep glob compatibility
            relativeExclusions.push(rel.split(path.sep).join('/'));
        }
    }
    return relativeExclusions;
}