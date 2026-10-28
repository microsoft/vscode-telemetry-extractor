// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as cp from 'child_process';
import * as path from 'path';
import { rgPath } from '@vscode/ripgrep';

export function parseRipgrepFilePaths(output: string): string[] {
    // Sorting after ripgrep exits preserves its parallel filesystem traversal.
    return output
        .split(/(?:\r\n|\r|\n)/g)
        .filter(filePath => filePath.length > 0)
        .sort();
}

/**
 * Runs ripgrep with `--files-with-matches` over a source directory and returns the sorted absolute paths of matching files.
 * Ripgrep matches relative globs (such as exclusions) against paths relative to its working directory, so it runs from the source directory.
 * Ripgrep exits with 1 when nothing matches; that is not an error.
 * Any other failure throws, so an unreadable tree is never mistaken for one without telemetry.
 */
export function findFilesWithRipgrep(sourceDir: string, args: string[]): string[] {
    const root = path.resolve(sourceDir);
    // Searching `.` keeps globs relative to the root even when the root is reached through a symlink
    const result = cp.spawnSync(rgPath, ['--files-with-matches', ...args, '--', '.'], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        windowsHide: true
    });
    if (result.error) {
        throw new Error(`Failed to run ripgrep in ${root}: ${result.error.message}`);
    }
    if (result.status === 0 || result.status === 1) {
        return parseRipgrepFilePaths(result.stdout).map(file => path.join(root, file));
    }
    throw new Error(`ripgrep exited with code ${result.status} in ${root}: ${result.stderr.trim()}`);
}
