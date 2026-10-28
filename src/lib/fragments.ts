// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import type { DeclaredProperty } from './events';

export class Fragments {
    public dataPoints: Fragment[] = [];
}

export class Fragment {
    public properties: DeclaredProperty[] = [];
    constructor(public name: string) { }
}
