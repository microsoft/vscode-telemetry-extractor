// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ColumnType, Property, ColumnInfo } from './common-properties';
import { Event, Metadata, Wildcard, TableInfo as JsonTableInfo } from './events';
import type { TableHeader } from './event-declarations';
import type { Dictionary } from './object-utils';
import * as keywords from './keywords';
import { isMeasurementFlag } from './operations';

export interface NormalizedEvent {
    event: Dictionary;
    tableInfo?: TableHeader;
}

/**
 * Converts a resolved `__GDPR__` event (includes and inlines already expanded) to its output shape.
 */
export function eventToOutput(event: Event): NormalizedEvent {
    const output: Dictionary = Object.create(null);
    for (const property of event.properties) {
        if (property instanceof Wildcard) {
            const entries = (output[keywords.wildcard] ??= []) as Dictionary[];
            for (const entry of property.entries) {
                const prefix = entry.prefix.toLowerCase();
                if (entries.some(e => e[keywords.prefix] === prefix)) {
                    continue;
                }
                const classification = entry.endpoint
                    ? { classification: entry.classification.classification, purpose: entry.classification.purpose, endPoint: 'none' }
                    : entry.classification;
                entries.push({ [keywords.prefix]: prefix, [keywords.classification]: classification });
            }
        } else if (property instanceof Property) {
            const name = propertyNameChanger(property.name);
            const existing = output[name] as Dictionary | undefined;
            if (existing) {
                // A declaration can list a property more than once through fragments; a measurement flag on any of them wins.
                if (property.isMeasurement) {
                    existing.isMeasurement = true;
                }
                continue;
            }
            const converted: Dictionary = { classification: property.classification, purpose: property.purpose };
            if (property.expiration) converted.expiration = property.expiration;
            if (property.owner) converted.owner = property.owner;
            if (property.comment) converted.comment = property.comment;
            if (property.endPoint) converted.endPoint = property.endPoint;
            // Explicit so that duplicate declarations which disagree are reported; false is removed when merging
            converted.isMeasurement = property.isMeasurement === true;
            if (property.column) {
                converted.column = { name: property.column.name ?? property.name, type: property.column.type };
            }
            output[name] = converted;
        } else if (property instanceof Metadata) {
            output[propertyNameChanger(property.name)] = property.value;
        }
    }
    const tableInfo = event.tableInfo
        ? { name: event.tableInfo.name, commonProperties: event.tableInfo.commonProperties, backfill: event.tableInfo.backfill }
        : undefined;
    return { event: output, tableInfo };
}

/** Converts a common property to its output shape, keyed by its output name. */
export function commonPropertyToOutput(property: Property): { name: string; property: Dictionary } {
    const converted: Dictionary = { classification: property.classification, purpose: property.purpose };
    if (property.endPoint) converted.endPoint = property.endPoint;
    // Explicit so that duplicate declarations which disagree are reported; false is removed when merging
    converted.isMeasurement = property.isMeasurement === true;
    return { name: propertyNameChanger(property.name), property: converted };
}

type TypeScriptPropertyDeclaration = {
    isMeasurement?: unknown;
    type?: unknown;
    column?: unknown;
};

/**
 * Converts the properties resolved from a `publicLog2` call to their output shape.
 * Property names in TS declarations are already lowercased.
 */
export function transformTypeScriptDeclaration(declaration: Dictionary): NormalizedEvent {
    const event: Dictionary = Object.create(null);
    let tableInfo: TableHeader | undefined;
    for (const [name, value] of Object.entries(declaration)) {
        if (name === '$tableinfo') {
            const json = JsonTableInfo.fromObject(value);
            if (json) {
                tableInfo = { name: json.name, commonProperties: json.commonProperties, backfill: json.backfill };
            }
            continue;
        }
        if (!value || typeof value !== 'object') {
            event[name] = value;
            continue;
        }
        const { type, column, ...property } = value as TypeScriptPropertyDeclaration;
        // Explicit so that duplicate declarations which disagree are reported; false is removed when merging
        property.isMeasurement = isMeasurementFlag(property.isMeasurement);
        let columnInfo: { name: string; type: ColumnType } | undefined;
        if (column !== undefined) {
            if (ColumnInfo.is(column)) {
                const columnType = ColumnType.fromString(column.type);
                if (columnType) {
                    columnInfo = { name: column.name ?? name, type: columnType };
                }
            }
        } else if (typeof type === 'string') {
            const columnType = ColumnType.fromString(type);
            if (columnType) {
                columnInfo = { name, type: columnType };
            }
        }
        event[name] = columnInfo ? { ...property, column: columnInfo } : property;
    }
    return { event, tableInfo };
}

function propertyNameChanger(name: string) {
    return name.toLowerCase().replace('<number>', '<NUMBER>');
}
