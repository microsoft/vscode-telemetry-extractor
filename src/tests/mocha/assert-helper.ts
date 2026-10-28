// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import type { TsEventDeclaration } from '../../lib/ts-parser';

export function sameValues(array1: string[], array2: string[]) {
    const hash1 = Object.create(null);
    array1.forEach(e => hash1[e] = e);

    const hash2 = Object.create(null);
    array2.forEach(e => hash2[e] = e);

    assert.deepStrictEqual(hash1, hash2);
    assert.ok(true);
}

/** Groups the declarations returned by the TS parser by event name. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function byEventName(declarations: TsEventDeclaration[]): Record<string, any> {
    const events = Object.create(null);
    for (const { name, properties } of declarations) {
        events[name] = Object.assign(events[name] ?? Object.create(null), properties);
    }
    return events;
}

/** Runs the callback while collecting everything written to console.error. */
export async function captureErrors<T>(callback: () => Promise<T>): Promise<{ errors: string[]; result: Promise<T> }> {
    const previousConsoleError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => errors.push(args.map(String).join(' '));
    try {
        const result = callback();
        await result.catch(() => undefined);
        return { errors, result };
    } finally {
        console.error = previousConsoleError;
    }
}
