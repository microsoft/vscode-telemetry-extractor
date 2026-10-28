// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Fragments, Fragment } from "./fragments";
import { Events, Event, Include, Inline, Wildcard, WildcardEntry, Metadata } from "./events";
import { ColumnType, ColumnInfo, Property } from "./common-properties";
import * as keywords from './keywords';
import * as path from 'path';

// Combines fragments of the same name, since a fragment may be declared across several comments
export function mergeFragments(target: Fragments, source: Fragments) {
    for (const item of source.dataPoints) {
        const found = target.dataPoints.find(f => f.name === item.name);
        if (found) {
            found.properties = found.properties.concat(item.properties);
        } else {
            target.dataPoints.push(item);
        }
    }
}

// Searches the object for an event or fragment of the specific name
// If found returns, if not found creates it, places it in the array, and then returns
export function findOrCreate(searchTarget: Events | Fragments, name: string) {
    let found = searchTarget.dataPoints.find((item) => {
        return item.name === name;
    });
    if (!found) {
        found = searchTarget instanceof Events ? new Event(name) : new Fragment(name);
        searchTarget.dataPoints.push(found);
    }
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
        // Skip the `$tableInfo` property since it is an artificial property for the flat table support.
        if (propertyName === '$tableInfo') {
            continue;
        }
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
            if (isMeasurementFlag(currentProperty.isMeasurement)) {
                prop.isMeasurement = true;
            }
            if (typeof currentProperty.type === 'string') {
                const columnType = ColumnType.fromString(currentProperty.type);
                if (columnType) {
                    prop.column = { type: columnType };
                }
            } else if (ColumnInfo.is(currentProperty.column)) {
                const columnType = ColumnType.fromString(currentProperty.column.type);
                if (columnType) {
                    prop.column = { name: currentProperty.column.name, type: columnType };
                }
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

// Some annotations declare the flag as the string "true"
export function isMeasurementFlag(value: unknown): boolean {
    return value === true || value === 'true';
}
