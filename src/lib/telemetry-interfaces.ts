import { Wildcard } from "./events";

export interface ITelemetryData{
    dataPoints: Array<ITelemetryDataPoint>
}

export interface ITelemetryDataPoint {
    name: string;
    properties: Array<IProperty | IInclude | IInline | Wildcard>;
}

export interface IProperty {
    name: string;
    purpose: string;
    classification: string;
}

export interface IInclude {
    includeNames: Array<string>;
}

export interface IInline {
    inlineName: string;
    inlines: Array<string>;
}

export interface IWildcard {
    entries: Array<IWildcardEntry>;
}

export interface IWildcardEntry {
    prefix: string;
    classification: {classification: string, purpose: string};
    endpoint: string | undefined;
}