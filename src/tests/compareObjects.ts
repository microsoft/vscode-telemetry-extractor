import * as fs from 'fs';
// Compares the GDPR json file and my JSON file to look for discrepencies
function compare() {
    let gdprContents: any = fs.readFileSync('src/tests/declarations-gdpr.json');
    let telemetryContents: any = fs.readFileSync('src/tests/declarations-telemetry.json');
    gdprContents = JSON.parse(gdprContents.toString());
    delete gdprContents['diagnostics'];
    telemetryContents = JSON.parse(telemetryContents.toString());
    const missingEvents: Array<string> = [];
    const missingProperties: Array<string> = [];
    const missingCommonProperties: Array<string> = [];
    // Checks to see if all events with their common properties exist in both
    for (const eventName in gdprContents['events']) {
        const foundEvent = telemetryContents['events'][eventName]
        if (!foundEvent) {
            missingEvents.push(eventName);
            continue;
        }
        for(const propName in gdprContents['events'][eventName]) {
            if (!foundEvent[propName]) {
                missingProperties.push(`${eventName}.${propName}`);
            }
        }
    }
    // Checks to see if all common properties exist in both
    for (const commonProp in gdprContents['commonProperties']) {
        if (!telemetryContents['commonProperties'][commonProp]) {
            missingCommonProperties.push(`common.${commonProp}`);
        }
    }
    let missingItems: Array<string> = missingEvents.concat(missingProperties);
    missingItems = missingItems.concat(missingCommonProperties);
    return missingItems;
}

// We run the tests when this is executed
const missing = compare();
for (const name of missing) {
    console.log(name);
}