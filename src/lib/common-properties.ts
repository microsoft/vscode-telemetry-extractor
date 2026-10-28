// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
    export function is(obj: unknown): obj is ColumnInfo {
        const candidate = obj as ColumnInfo;
        return !!candidate &&
            (candidate.name === undefined || typeof candidate.name === 'string') &&
            typeof candidate.type === 'string' && ColumnType.fromString(candidate.type) !== undefined;
    }
}

/** Optional details of a classified property. */
export interface PropertyDetails {
    expiration?: string;
    owner?: string;
    comment?: string;
    endPoint?: string;
    isMeasurement?: boolean;
    /**
     * The name and type of the property if mirrored into a flat table in Kusto.
     * Flat table properties are not allowed in the GDPR catalog, so this is only emitted as table info.
     */
    column?: ColumnInfo;
    /** Where the property was declared, as `path:line`. Only tracked for common properties. */
    location?: string;
}

export class Property implements PropertyDetails {
    public expiration?: string;
    public owner?: string;
    public comment?: string;
    public endPoint?: string;
    public isMeasurement?: boolean;
    public column?: ColumnInfo;
    public location?: string;

    constructor(
        public name: string,
        public classification: string,
        public purpose: string,
        details: PropertyDetails = {}
    ) {
        this.expiration = details.expiration;
        this.owner = details.owner;
        this.comment = details.comment;
        this.endPoint = details.endPoint;
        this.isMeasurement = details.isMeasurement;
        this.column = details.column;
        this.location = details.location;
    }

    /** Copies the property under another name, as when a fragment is inlined. Column metadata is not copied. */
    public withName(name: string): Property {
        const { expiration, owner, comment, endPoint, isMeasurement } = this;
        return new Property(name, this.classification, this.purpose, { expiration, owner, comment, endPoint, isMeasurement });
    }
}
