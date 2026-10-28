// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type Dictionary = Record<string, unknown>;

export function isDictionary(value: unknown): value is Dictionary {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Deep copies JSON-like data into prototype-less objects, preserving key order. */
export function cloneDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(cloneDeep) as T;
    }
    if (isDictionary(value)) {
        const clone: Dictionary = Object.create(null);
        for (const [key, child] of Object.entries(value)) {
            clone[key] = cloneDeep(child);
        }
        return clone as T;
    }
    return value;
}

/** Deep copies JSON-like data into prototype-less objects with alphabetically sorted keys. */
export function deepSortKeys<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(deepSortKeys) as T;
    }
    if (isDictionary(value)) {
        const sorted: Dictionary = Object.create(null);
        for (const key of Object.keys(value).sort()) {
            sorted[key] = deepSortKeys(value[key]);
        }
        return sorted as T;
    }
    return value;
}

export function deepEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(deepSortKeys(left)) === JSON.stringify(deepSortKeys(right));
}
