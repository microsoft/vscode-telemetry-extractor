// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Declarations, OutputtedDeclarations } from "./declarations";
import { ColumnType, Property, ColumnInfo } from "./common-properties";
import { Metadata, Wildcard, TableInfo as JsonTableInfo } from "./events";
import * as keywords from './keywords';

// Converts the declarations array to an object format for easy readability.

type TableInfo = OutputtedDeclarations['tableInfos'][number];
type BagInfo = TableInfo['columns'][number]['bag'];

export async function transformOutput(output: Declarations): Promise<OutputtedDeclarations> {
    // If there's no events or common properties, we emit a null object
    if (output.events.dataPoints.length === 0 && output.commonProperties.properties.length === 0) {
        return { events: Object.create(null), commonProperties: Object.create(null), tableInfos: [] };
    }
    const newEvents = Object.create(null);
    const oldEvents = output.events.dataPoints;
    const tableInfos: TableInfo[] = [];
    for (const event of oldEvents) {
        // Check if event.name ends with a number, if so throw an error because we don't support event names which end with numbers
        if (/\d$/.test(event.name)) {
            throw new Error(`Event name ${event.name} ends with a number. Event names cannot end with numbers.`);
        }
        newEvents[event.name] = Object.create(null);
        const tableInfo: TableInfo | undefined = event.tableInfo ? { ...event.tableInfo, columns: [] } : undefined;
        //We know there won't be anymore includes or inlines because we have resolved them
        for (const property of event.properties as Array<Property | Wildcard | Metadata>) {
            if (property instanceof Wildcard) {
                newEvents[event.name][keywords.wildcard] = newEvents[event.name][keywords.wildcard] ? newEvents[event.name][keywords.wildcard] : [];
                for (const entry of property.entries) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                // Check if property name is 'value' and throw an error if it is
                if (propetyNameChanger(property.name) === 'value') {
                    throw new Error(`Property name 'value' is reserved and cannot be used due to conflicts with the SDK. Please rename the property.`);
                }
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
                if (tableInfo !== undefined && property.column) {
                    const name = property.column.name ?? property.name;
                    tableInfo.columns.push({ name, type: property.column.type, bag: { name: property.name, store: property.isMeasurement === true ? 'Measures' : 'Properties' } });
                }
            } else {
                // Comments, expiration, and owner metadata are handled here
                newEvents[event.name][propetyNameChanger(property.name)] = property.value;
            }
        }
        if (tableInfo !== undefined) {
            tableInfos.push(tableInfo);
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
    return { events: newEvents, commonProperties: newCommonProperties, tableInfos };
}

type TypeScriptPropertyDeclaration = {
    name?: string;
    isMeasurement?: boolean;
    type?: string;
    column?: { name?: string; type?: string }
}
type TypeScriptEventDeclaration = {
    $tableInfo?: unknown;
    [name: string]: TypeScriptPropertyDeclaration | unknown;
};

export function transformTypeScriptDeclaration(declaration: TypeScriptEventDeclaration): { declaration: object, tableInfo: TableInfo | undefined} {
    // The property names in the TS events are already all lowercased.
    const tableInfoProperty = declaration['$tableinfo'];
    let tableInfo: TableInfo | undefined = undefined;
    if (tableInfoProperty !== undefined) {
        delete declaration['$tableinfo'];
        const json = JsonTableInfo.fromObject(tableInfoProperty);
        if (json !== undefined) {
            tableInfo = { name: json.name, commonProperties: json.commonProperties, backfill: json.backfill, columns: [] };
        }
    }
    for (const name of Object.keys(declaration)) {
        if (name === '$tableinfo') {
            continue;
        }
        const property = declaration[name] as TypeScriptPropertyDeclaration;
        if (!property || typeof property !== 'object') {
            continue;
        }
        if (tableInfo !== undefined) {
            if (property.column !== undefined) {
                if (ColumnInfo.is(property.column)) {
                    const bag: BagInfo = { store: property.isMeasurement === true ? 'Measures' : 'Properties', name: name };
                    tableInfo.columns.push({ name: property.column.name ?? name, type: property.column.type, bag });
                }
            } else if (typeof property.type === 'string') {
                const columnType = ColumnType.fromString(property.type);
                if (columnType) {
                    const bag: BagInfo = { store: property.isMeasurement === true ? 'Measures' : 'Properties', name: name };
                    tableInfo.columns.push({ name: name, type: columnType, bag });
                }
            }
        }
        delete property.type;
        delete property.column;
    }
    return { declaration, tableInfo };
}


function propetyNameChanger(name: string) {
    name = name.toLowerCase();
    if (name.includes('<number>')) {
        name = name.replace('<number>', '<NUMBER>');
    }
    return name;
}