import { Parser } from "../../lib/parser";
import { Property, CommonProperties } from '../../lib/common-properties'; 
import { cwd } from 'process';
import * as path from 'path';
import * as assert from 'assert';
import { Event, Events } from "../../lib/events";
import { Fragment, Fragments } from "../../lib/fragments";
//@ts-ignore
import { getResolvedDeclaration } from '../../lib/save-declarations';
import { ParserOptions } from "../../cli-options";
import { Declarations } from "../../lib/declarations";
import { patchWebsiteEvents } from "../../lib/website-patch";

const sourceDirs = [path.join(cwd(),'src/tests/mocha/resources/source')];
const excludedDirs = ['excluded'];

export function nameSort(arrayToSort: Array<Event | Fragment>) {
    return arrayToSort.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
        } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
        } else {
            return 0;
        }
    });
}
describe('GDPR Declaration Tests', () => {
    it('extract declarations', async () => {
        const parser = new Parser(sourceDirs, excludedDirs, true, true);
        const declarations = await parser.extractDeclarations();
        assert.ok(declarations);
        assert.strictEqual(declarations.events.dataPoints.length, 3);
        assert.strictEqual(declarations.fragments.dataPoints.length, 7);
        assert.strictEqual(declarations.commonProperties.properties.length, 2);
        assert.deepStrictEqual(declarations.commonProperties.properties[0], new Property('timestamp', 'SystemMetaData', 'FeatureInsight', 'none'));
        assert.deepStrictEqual(declarations.commonProperties.properties[1], new Property('machineid', 'EndUserPseudonymizedInformation', 'FeatureInsight', 'MacAddressHash'));
        // We don't care what order they're read in but we want to have a consistent order so we sort them
        declarations.events.dataPoints = nameSort(declarations.events.dataPoints);
        assert.strictEqual(declarations.events.dataPoints[0].name, 'E1');
        assert.strictEqual(declarations.events.dataPoints[1].name, 'E2');
        assert.strictEqual(declarations.events.dataPoints[2].name, 'E3');
        // We don't care what order they're read in but we want to have a consistent order so we sort them
        declarations.fragments.dataPoints = nameSort(declarations.fragments.dataPoints);
        assert.strictEqual(declarations.fragments.dataPoints[0].name, 'F0');
        assert.strictEqual(declarations.fragments.dataPoints[1].name, 'F1');
        assert.strictEqual(declarations.fragments.dataPoints[2].name, 'F2');
        assert.strictEqual(declarations.fragments.dataPoints[3].name, 'F3');
        assert.strictEqual(declarations.fragments.dataPoints[4].name, 'F4');
        assert.strictEqual(declarations.fragments.dataPoints[5].name, 'F5');
        assert.strictEqual(declarations.fragments.dataPoints[6].name, 'F6');
    });
    it('resolve declarations', async () => {
        const parserOptions: ParserOptions = {
            eventPrefix: '',
            addDebugEventsWorkaround: false,
            addWebsiteEventsWorkaround: false,
            includeIsMeasurement: true,
            applyEndpoints: true
        };
        const declarations = await getResolvedDeclaration(sourceDirs, excludedDirs, parserOptions);
        assert.ok(declarations);
        assert.strictEqual(declarations.events.dataPoints.length, 3);
        assert.strictEqual(declarations.commonProperties.properties.length, 2);
    });
    it('patch website events', () => {
        const declarations: Declarations = {events: new Events(), commonProperties: new CommonProperties(), fragments: new Fragments()};
        patchWebsiteEvents(declarations.events);
        assert.strictEqual(declarations.events.dataPoints.length, 3);
        assert.strictEqual(declarations.events.dataPoints[0].name,'websiteTracking/newUserInstall');
        assert.strictEqual(declarations.events.dataPoints[0].properties.length, 2);
        assert.strictEqual(declarations.events.dataPoints[1].name,'websitetracking/dbconnectionlog');
        assert.strictEqual(declarations.events.dataPoints[1].properties.length, 1);
        assert.strictEqual(declarations.events.dataPoints[2].name,'nps/surveyResult');
        assert.strictEqual(declarations.events.dataPoints[2].properties.length, 7);
    });
});