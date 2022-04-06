// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Wildcard } from "./events";

export interface ITelemetryData{
    dataPoints: Array<ITelemetryDataPoint>
}

export interface ITelemetryDataPoint {
    name: string;
    properties: Array<IProperty | IInclude | IInline | IMetadata | Wildcard>;
}

export interface IMetadata {
    name: 'owner' | 'comment' | 'expiration';
    value: string;
}

export interface IProperty {
    name: string;
    purpose: string;
    classification: string;
    expiration?: string;
    owner?: string;
    comment?: string;
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