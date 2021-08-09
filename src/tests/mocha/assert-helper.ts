// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';

export function sameValues(array1: string[], array2: string[]) {
    let hash1 = Object.create(null);
    array1.forEach(e => hash1[e] = e);

    let hash2 = Object.create(null);
    array2.forEach(e => hash2[e] = e);

    assert.deepStrictEqual(hash1, hash2);
    assert.ok(true);
}
