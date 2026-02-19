// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from 'fs';
import * as path from 'path';

/**
 * @param {string} outputFile 
 * @param {string} contents 
 * @returns {Promise}
 */
export async function writeFile(outputFile: string, contents: string) {
    const directory = path.dirname(outputFile);
    return mkdirp(directory).then(() => {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(outputFile, contents, { encoding: 'utf8' }, (err: NodeJS.ErrnoException | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        });
    });
}

// copied from https://github.com/Microsoft/vscode/blob/master/src/main.js#L139
async function mkdirp(dir: string): Promise<string> {
    return mkdir(dir)
        .then(null, function (err: NodeJS.ErrnoException) {
            if (err && err.code === 'ENOENT') {
                const parent = path.dirname(dir);
                if (parent !== dir) { // if not arrived at root
                    return mkdirp(parent)
                        .then(function () {
                            return mkdir(dir);
                        });
                }
            }
            throw err;
        });
}

// copied from https://github.com/Microsoft/vscode/blob/master/src/main.js#L155
async function mkdir(dir: string): Promise<string> {
    return new Promise(function (resolve, reject) {
        fs.mkdir(dir, function (err: NodeJS.ErrnoException | null) {
            if (err && err.code !== 'EEXIST') {
                reject(err);
            } else {
                resolve(dir);
            }
        });
    });
}