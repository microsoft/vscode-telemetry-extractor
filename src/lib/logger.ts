// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/** Writes progress to stderr, so stdout only ever contains the extracted JSON. */
export function logMessage(msg: string, silenceOutput = false) {
    if (!silenceOutput) {
        console.error(msg);
    }
}
