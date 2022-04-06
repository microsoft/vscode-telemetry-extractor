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

export class Event implements ITelemetryDataPoint {
    public name: string;
    // It gets a little more complicated here as events can have a bunch of different things
    public properties: Array<Property | Metadata | Include | Inline | Wildcard>;
    constructor (name: string) {
        this.name =  name;
        this.properties = [];
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