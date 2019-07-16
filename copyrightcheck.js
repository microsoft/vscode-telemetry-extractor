const globby = require('globby');
const fs = require('fs');
const process = require('process');

(async () => {
    const paths = await globby(['**/*.ts', '!src/telemetry-sources/**', '!node_modules/**']);
    for (const path of paths) {
        const contents = fs.readFileSync(path).toString();
        if (!contents.includes('Copyright (c) Microsoft Corporation')) {
            console.log(`Bad copyright in ${path}`);
            process.exit(1);
        }
    }
})();
