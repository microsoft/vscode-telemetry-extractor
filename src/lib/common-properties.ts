// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IProperty } from "./telemetry-interfaces";

export class CommonProperties {
    public properties: Array<Property>;
    constructor () {
        this.properties = [];
    }
}

export type ColumnType =
    'bool' |
    'int' |
    'long' |
    'real' |
    'decimal' |
    'dynamic' |
    'guid' |
    'string' |
    'datetime' |
    'timespan';

export namespace ColumnType {
    export function fromString(type: string): ColumnType | undefined{
        switch (type.toLowerCase()) {
            case 'bool':
            case 'boolean':
                return 'bool';
            case 'int':
                return 'int';
            case 'long':
                return 'long';
            case 'real':
            case 'double':
                return 'real';
            case 'decimal':
                return 'decimal';
            case 'dynamic':
                return 'dynamic';
            case 'guid':
            case 'uuid':
            case 'uniqueid':
                return 'guid';
            case 'string':
                return 'string';
            case 'datetime':
            case 'date':
                return 'datetime';
            case 'timespan':
            case 'time':
                return 'timespan';
            default:
                return undefined;
        }
    }
}

export type ColumnInfo = {
    name?: string;
    type: ColumnType;
}

export namespace ColumnInfo {
    export function is(obj: any): obj is ColumnInfo {
        const candidate = obj as ColumnInfo;
        return !!candidate &&
            (candidate.name === undefined || typeof candidate.name === 'string') &&
            typeof candidate.type === 'string' && ColumnType.fromString(candidate.type) !== undefined;
    }
}

export class Property implements IProperty {
    public name: string;
    public classification: string;
    public purpose: string;
    public endPoint?: string;
    public isMeasurement?: boolean;
    public expiration?: string;
    public owner?: string;
    public comment?: string;

    // The name and type of the property if mirrored into a flat table in Kusto.
    // Needs to be removed when generating the patch for the GDPR catalog as
    // flat table properties are not allowed in the catalog.
    public column?: ColumnInfo;

    constructor (
        name: string,
        classification: string,
        purpose: string,
        expiration?: string,
        owner?: string,
        comment?: string,
        endpoint?: string,
        isMeasurement?: boolean,
    ) {
        this.name = name;
        this.classification = classification;
        this.purpose = purpose;
        this.endPoint = endpoint;
        this.isMeasurement = isMeasurement;
        this.expiration = expiration;
        this.owner = owner;
        this.comment = comment;
    }
}