// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IInclude, ITelemetryDataPoint, ITelemetryData, IInline, IWildcard, IWildcardEntry, IMetadata } from './telemetry-interfaces';
import { Property } from './common-properties';


export class Events implements ITelemetryData {
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

export class Event implements ITelemetryDataPoint {
    public name: string;
    // It gets a little more complicated here as events can have a bunch of different things
    public properties: Array<Property | Metadata | Include | Inline | Wildcard>;
    public tableInfo?: TableInfo;
    constructor (name: string) {
        this.name =  name;
        this.properties = [];
        this.tableInfo = undefined;
    }
}

export class Include implements IInclude {
    public includeNames: Array<string>;
    constructor (includeNames: Array<string>) {
        this.includeNames = includeNames;
    }
}

export class Inline implements IInline {
    public inlineName: string;
    public inlines: Array<string>;
    constructor (name: string, inlines: Array<string>) {
        this.inlineName = name;
        this.inlines = inlines;
    }
}

export class Wildcard implements IWildcard {
    public entries: Array<WildcardEntry>;
    constructor () {
        this.entries = [];
    }
}

export class WildcardEntry implements IWildcardEntry {
    public prefix: string;
    public classification: {classification: string, purpose: string};
    public endpoint: string | undefined;
    constructor (prefix: string, classification: {classification: string, purpose: string}, endPoint?: string | undefined) {
        this.prefix = prefix;
        this.classification = classification;
        this.endpoint = endPoint;
    }
}

export class Metadata implements IMetadata {
    public name: 'owner' | 'comment' | 'expiration';
    public value: string;
    constructor (name: 'owner' | 'comment' | 'expiration', value: string) {
        this.name = name;
        this.value = value;
    }

    simpleObject(): {[key: string]: string} {
        const simple = Object.create(null);
        simple[this.name] = this.value;
        return simple;
    }
}