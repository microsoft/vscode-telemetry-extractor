// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as keywords from './keywords';
import { cloneDeep, deepEqual, Dictionary, isDictionary } from './object-utils';
import type { ColumnType, TableInfo } from '../../vscode-telemetry-extractor';

export type DeclarationSource = 'GDPR' | 'TS' | 'debug-patch';

export type TableHeader = Omit<TableInfo, 'columns'>;

/**
 * One declaration of an event (a `__GDPR__` comment, a `publicLog2` call, or a patched event),
 * already normalized to the shape the event has in the extractor output.
 * Properties may still carry `column` metadata, which is moved into the table info when merging.
 */
export interface EventDeclaration {
    name: string;
    location: string;
    source: DeclarationSource;
    event: Dictionary;
    tableInfo?: TableHeader;
}

export interface DeclarationConflict {
    eventName: string;
    field: string[];
    declarations: { location: string; source: DeclarationSource; value: unknown }[];
}

export interface MergedDeclarations {
    events: Record<string, Dictionary>;
    tableInfos: Record<string, TableInfo>;
    conflicts: DeclarationConflict[];
}

const tableInfoField = '$tableInfo';

/**
 * Merges every declaration of each event into one output event.
 * Declarations may contribute disjoint properties and fields, but every field that more than one
 * declaration sets must have the same value. Otherwise, the result would depend on discovery order,
 * so the field is reported as a conflict instead.
 * Properties must state `isMeasurement` as `true` or `false`, since its absence would let either value win.
 */
export function mergeEventDeclarations(declarations: readonly EventDeclaration[]): MergedDeclarations {
    const byName = new Map<string, EventDeclaration[]>();
    for (const declaration of declarations) {
        const group = byName.get(declaration.name);
        if (group) {
            group.push(declaration);
        } else {
            byName.set(declaration.name, [declaration]);
        }
    }

    const events: Record<string, Dictionary> = Object.create(null);
    const tableInfos: Record<string, TableInfo> = Object.create(null);
    const tableOwners = new Map<string, EventDeclaration[]>();
    const conflicts: DeclarationConflict[] = [];

    for (const [eventName, group] of byName) {
        const conflictingFields = new Map<string, string[]>();
        const onConflict = (field: string[]) => conflictingFields.set(JSON.stringify(field), field);

        const event: Dictionary = Object.create(null);
        let header: Dictionary | undefined;
        for (const declaration of group) {
            mergeInto(event, declaration.event, [], onConflict);
            if (declaration.tableInfo) {
                header ??= Object.create(null);
                mergeInto(header!, declaration.tableInfo as unknown as Dictionary, [tableInfoField], onConflict);
            }
        }

        for (const field of conflictingFields.values()) {
            conflicts.push({ eventName, field, declarations: describeField(group, field) });
        }

        const columns = extractColumns(event);
        removeFalseMeasurements(event);
        events[eventName] = event;
        if (header) {
            const tableInfo = { ...(header as TableHeader), columns };
            const owners = tableOwners.get(tableInfo.name) ?? [];
            owners.push(...group.filter(declaration => declaration.tableInfo));
            tableOwners.set(tableInfo.name, owners);
            if (tableInfos[tableInfo.name]) {
                conflicts.push({
                    eventName,
                    field: [tableInfoField, 'name'],
                    declarations: owners.map(({ location, source, name }) => ({ location, source, value: `${tableInfo.name} (event '${name}')` }))
                });
            }
            tableInfos[tableInfo.name] = tableInfo;
        }
    }

    return { events, tableInfos, conflicts };
}

export function formatConflicts(conflicts: readonly DeclarationConflict[]): string[] {
    const lines: string[] = [];
    const byEvent = new Map<string, DeclarationConflict[]>();
    for (const conflict of conflicts) {
        byEvent.set(conflict.eventName, [...(byEvent.get(conflict.eventName) ?? []), conflict]);
    }
    for (const [eventName, eventConflicts] of byEvent) {
        lines.push(`Duplicate telemetry event declaration '${eventName}' has conflicting details at:`);
        const locations = new Set(eventConflicts.flatMap(conflict => conflict.declarations.map(formatLocation)));
        for (const location of locations) {
            lines.push(` - ${location}`);
        }
        for (const conflict of eventConflicts) {
            lines.push(`   Conflicting field '${conflict.field.join(' > ')}':`);
            for (const declaration of conflict.declarations) {
                lines.push(`     ${JSON.stringify(declaration.value)} at ${formatLocation(declaration)}`);
            }
        }
    }
    return lines;
}

function formatLocation(declaration: { location: string; source: DeclarationSource }) {
    return `${declaration.location.replace(/\\/g, '/')} (${declaration.source})`;
}

function mergeInto(target: Dictionary, source: Dictionary, field: string[], onConflict: (field: string[]) => void) {
    for (const [key, value] of Object.entries(source)) {
        if (value === undefined) {
            continue;
        }
        const childField = [...field, key];
        const existing = target[key];
        if (existing === undefined) {
            target[key] = cloneDeep(value);
        } else if (isDictionary(existing) && isDictionary(value)) {
            mergeInto(existing, value, childField, onConflict);
        } else if (key === keywords.wildcard && Array.isArray(existing) && Array.isArray(value)) {
            mergeWildcards(existing, value, childField, onConflict);
        } else if (!deepEqual(existing, value)) {
            onConflict(childField);
        }
    }
}

function mergeWildcards(target: unknown[], source: unknown[], field: string[], onConflict: (field: string[]) => void) {
    for (const entry of source) {
        const prefix = wildcardPrefix(entry);
        const existing = target.find(candidate => prefix !== undefined && wildcardPrefix(candidate) === prefix);
        if (existing === undefined) {
            target.push(cloneDeep(entry));
        } else if (isDictionary(existing) && isDictionary(entry)) {
            mergeInto(existing, entry, [...field, prefix!], onConflict);
        }
    }
}

function wildcardPrefix(entry: unknown): string | undefined {
    const prefix = isDictionary(entry) ? entry[keywords.prefix] : undefined;
    return typeof prefix === 'string' ? prefix : undefined;
}

function describeField(declarations: readonly EventDeclaration[], field: readonly string[]) {
    const values = [];
    for (const declaration of declarations) {
        const root = field[0] === tableInfoField ? declaration.tableInfo : declaration.event;
        const value = valueAt(root, field[0] === tableInfoField ? field.slice(1) : field);
        if (value !== undefined) {
            values.push({ location: declaration.location, source: declaration.source, value });
        }
    }
    return values;
}

function valueAt(root: unknown, field: readonly string[]): unknown {
    let current = root;
    for (const key of field) {
        if (Array.isArray(current)) {
            current = current.find(entry => wildcardPrefix(entry) === key);
        } else if (isDictionary(current)) {
            current = current[key];
        } else {
            return undefined;
        }
    }
    return current;
}

/** Declarations state `isMeasurement: false` explicitly so disagreements are detected, but the output only marks measurements. */
function removeFalseMeasurements(event: Dictionary) {
    for (const property of Object.values(event)) {
        if (isDictionary(property) && property.isMeasurement === false) {
            delete property.isMeasurement;
        }
    }
}

/** Removes column metadata from the merged properties and returns it as table columns. */
function extractColumns(event: Dictionary): TableInfo['columns'] {
    const columns: TableInfo['columns'] = [];
    for (const [propertyName, property] of Object.entries(event)) {
        if (!isDictionary(property) || !isDictionary(property.column)) {
            continue;
        }
        const column = property.column as { name: string; type: ColumnType };
        delete property.column;
        columns.push({
            name: column.name,
            type: column.type,
            bag: { name: propertyName, store: property.isMeasurement === true ? 'Measures' : 'Properties' }
        });
    }
    return columns;
}
