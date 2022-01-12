// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IProperty } from "./telemetry-interfaces";

export class CommonProperties {
    public properties: Array<Property>;
    constructor () {
        this.properties = [];
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
    
    constructor (
        name: string, 
        classification: string,
        purpose: string, 
        expiration?: string,
        owner?: string,
        comment?: string,
        endpoint?: string, 
        isMeasurement?: boolean
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