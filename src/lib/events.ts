import { IProperty, IInclude, ITelemetryDataPoint, ITelemetryData, IInline, IWildcard, IWildcardEntry } from './telemetry-interfaces';
import { Property } from './common-properties';


export class Events implements ITelemetryData {
    public dataPoints: Array<Event>;
    constructor () {
        this.dataPoints = [];
    }
}

export class Event implements ITelemetryDataPoint {
    public name: string;
    // It gets a little more complicated here as events can have includes as well
    public properties: Array<Property | Include | Inline | Wildcard>;
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
    constructor (prefix: string, classification: {classification: string, purpose: string}) {
        this.prefix = prefix;
        this.classification = classification;
    }
}