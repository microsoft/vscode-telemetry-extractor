// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Property } from './common-properties';


export class Events {
    public dataPoints: Array<Event>;
    constructor () {
        this.dataPoints = [];
    }
}

export type TableInfo = {
    name: string;
    commonProperties: 'standard';
    backfill: boolean | string;
}
export namespace TableInfo {
    export function fromObject(obj: unknown): TableInfo | undefined {
        if (typeof obj !== 'object' || obj === null) {
            return undefined;
        }
        const candidate: Partial<TableInfo> = obj as TableInfo;
        if (typeof candidate.name !== 'string') {
            return undefined;
        }
        const result: TableInfo = {
            name: candidate.name,
            commonProperties: 'standard',
            backfill: false

        };
        if (candidate.commonProperties === 'standard') {
            result.commonProperties = 'standard';
        }
        if (typeof candidate.backfill === 'boolean' || typeof candidate.backfill === 'string') {
            result.backfill = candidate.backfill;
        }
        return result;
    }
}

export class Event {
    public name: string;
    public properties: DeclaredProperty[];
    public tableInfo?: TableInfo;
    /** Where the event was declared, as `path:line`. */
    public location?: string;
    constructor (name: string, location?: string) {
        this.name =  name;
        this.properties = [];
        this.tableInfo = undefined;
        this.location = location;
    }
}

export class Include {
    public includeNames: Array<string>;
    constructor (includeNames: Array<string>) {
        this.includeNames = includeNames;
    }
}

export class Inline {
    public inlineName: string;
    public inlines: Array<string>;
    constructor (name: string, inlines: Array<string>) {
        this.inlineName = name;
        this.inlines = inlines;
    }
}

export class Wildcard {
    public entries: Array<WildcardEntry>;
    constructor () {
        this.entries = [];
    }
}

export class WildcardEntry {
    public prefix: string;
    public classification: {classification: string, purpose: string};
    public endpoint: string | undefined;
    constructor (prefix: string, classification: {classification: string, purpose: string}, endPoint?: string | undefined) {
        this.prefix = prefix;
        this.classification = classification;
        this.endpoint = endPoint;
    }
}

export class Metadata {
    public name: 'owner' | 'comment' | 'expiration';
    public value: string;
    constructor (name: 'owner' | 'comment' | 'expiration', value: string) {
        this.name = name;
        this.value = value;
    }
}

/** Everything an event or fragment annotation can contain before fragments are resolved. */
export type DeclaredProperty = Property | Metadata | Include | Inline | Wildcard;
