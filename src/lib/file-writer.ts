// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { mkdir, writeFile as fsWriteFile } from 'fs/promises';
import * as path from 'path';

export async function writeFile(outputFile: string, contents: string) {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await fsWriteFile(outputFile, contents, { encoding: 'utf8' });
}
