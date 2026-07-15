// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function parseRipgrepFilePaths(output: string): string[] {
    // Sorting after ripgrep exits preserves its parallel filesystem traversal.
    return output
        .split(/(?:\r\n|\r|\n)/g)
        .filter(filePath => filePath.length > 0)
        .sort();
}