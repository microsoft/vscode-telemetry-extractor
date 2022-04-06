// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ITelemetryData, ITelemetryDataPoint, IProperty, IWildcard } from './telemetry-interfaces';
import { Property } from './common-properties';
import { Include, Inline, Metadata } from './events';


// Fragments are retrieved as an object of objects of objects. So this just makes it easier to see the structure.
export class Fragments implements ITelemetryData{
    public dataPoints: Array<Fragment>;
    constructor () {
        this.dataPoints = [];
    }
}

export class Fragment implements ITelemetryDataPoint {
    public name: string;
    public properties: Array<Property | Metadata | Include |  Inline | IWildcard>;
    constructor (name: string) {
        this.name = name;
        this.properties = [];

    }
}