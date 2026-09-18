// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Project } from 'ts-morph';
import { runParserWorker, TsParser, TsProjectParser } from '../../lib/ts-parser';
import { extractAndResolveDeclarations } from '../../lib/save-declarations';

describe('TS Parser batches', function () {
    this.timeout(20000);
    let directory: string;
    let sourceFiles: string[];

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry batches '));
        fs.writeFileSync(path.join(directory, 'base.json'), JSON.stringify({
            compilerOptions: { strict: true, types: [], baseUrl: '.', paths: { fixture: ['./types'] } }
        }));
        fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ extends: './base.json' }));
        fs.copyFileSync(
            path.resolve('src/tests/mocha/resources/tsparser-tests/publicLog.ts'),
            path.join(directory, 'publicLog.ts')
        );
        fs.writeFileSync(path.join(directory, 'types.ts'), `
            export interface ImportedData { remote: string; }
            export interface ImportedClassification {
                remote: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; };
            }
        `);
        fs.writeFileSync(path.join(directory, 'ambient.ts'), `
            interface AmbientData { ambient: string; }
            interface AmbientClassification {
                ambient: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; };
            }
        `);
        fs.writeFileSync(path.join(directory, 'globals.ts'), `
            export {};
            declare global {
                interface GlobalData { count: number; }
                interface GlobalClassification {
                    count: {
                        classification: 'SystemMetaData';
                        purpose: 'FeatureInsight';
                        endPoint: 'MacAddressHash';
                    };
                }
            }
        `);
        fs.writeFileSync(path.join(directory, 'augment.ts'), `
            import './types';
            declare module './types' {
                interface ImportedData { enabled: boolean; }
                interface ImportedClassification {
                    enabled: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; };
                }
            }
        `);
        fs.writeFileSync(path.join(directory, 'support.ts'), `
            import './ambient';
            import './globals';
            import './augment';
        `);
        sourceFiles = [path.join(directory, 'publicLog.ts')];
        for (let index = 0; index < 65; index++) {
            const file = path.join(directory, `event-${String(index).padStart(2, '0')}.ts`);
            sourceFiles.push(file);
            fs.writeFileSync(file, `
                ${index === 0 ? "import './support';" : ''}
                import { publicLog2, publicLogError2 } from './publicLog';
                import type { ImportedData, ImportedClassification } from 'fixture';
                type Data = GlobalData & AmbientData & ImportedData;
                type Classification = Readonly<GlobalClassification & AmbientClassification & ImportedClassification>;
                const recordedEvent = 'BatchEvent${index}' as const;
                publicLog2<Data, Classification>(recordedEvent, {} as Data);
                ${index === 64 ? "publicLog2<Data, Classification>('CallOrder', {} as Data);" : ''}
                ${index === 0 ? "publicLogError2('CallOrder');" : ''}
            `);
        }
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    for (const applyEndpoints of [true, false]) {
        it(`preserves declarations and order across batches (endpoints: ${applyEndpoints})`, async () => {
            const lowerCaseEvents = !applyEndpoints;
            const project = new Project({
                tsConfigFilePath: path.join(directory, 'tsconfig.json'),
                skipAddingFilesFromTsConfig: true
            });
            for (const file of sourceFiles) {
                project.addSourceFileAtPath(file);
            }
            const reference = new TsProjectParser(project, applyEndpoints, lowerCaseEvents);
            const expected = reference.parseFiles();
            const parser = new TsParser(directory, [], applyEndpoints, lowerCaseEvents);
            const actual = await parser.parseFiles();

            assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
            assert.deepStrictEqual(
                JSON.parse(JSON.stringify([...parser.getEventDefinitions()])),
                JSON.parse(JSON.stringify([...reference.getEventDefinitions()]))
            );
            assert.strictEqual(Object.keys(actual).length, 66);
            for (let index = 0; index < 65; index++) {
                const event = actual[lowerCaseEvents ? `batchevent${index}` : `BatchEvent${index}`];
                assert.deepStrictEqual(Object.keys(event).sort(), ['ambient', 'count', 'enabled', 'remote']);
                assert.strictEqual(event.count.isMeasurement, true);
                assert.strictEqual(event.enabled.isMeasurement, true);
                assert.strictEqual(event.count.endPoint, applyEndpoints ? 'MacAddressHash' : undefined);
            }
            assert.deepStrictEqual(actual[lowerCaseEvents ? 'callorder' : 'CallOrder'], {});

            const resolved = await extractAndResolveDeclarations([{
                sourceDirs: [directory],
                excludedDirs: [],
                parserOptions: {
                    eventPrefix: '',
                    applyEndpoints,
                    patchDebugEvents: false,
                    lowerCaseEvents,
                    silenceOutput: true,
                    verbose: false
                }
            }]);
            assert.deepStrictEqual(
                JSON.parse(JSON.stringify(resolved.events)),
                JSON.parse(JSON.stringify(expected))
            );
        });
    }

    it('does not resolve dependencies when all calls only forward eventName', async () => {
        for (let index = 0; index < 65; index++) {
            fs.writeFileSync(sourceFiles[index + 1], `
                import { publicLog2 } from './publicLog';
                export function forward(eventName: string) {
                    publicLog2(eventName);
                }
            `);
        }
        const parser = new TsParser(directory, [], true, false);
        assert.deepStrictEqual(Object.keys(await parser.parseFiles()), []);
        assert.strictEqual(parser.getEventDefinitions().size, 0);
    });

    it('propagates worker failures instead of returning partial declarations', async () => {
        await assert.rejects(runParserWorker({
            kind: 'parse',
            calls: [{ filePath: path.join(directory, 'missing.ts'), calls: [] }],
            sharedSourceFiles: [],
            compilerOptions: {},
            applyEndpoints: true,
            lowerCaseEvents: false,
            events: {},
            definitions: []
        }), /missing\.ts/);
    });

    it('reports duplicate conflicts across batches', async () => {
        for (const [index, purpose] of [[0, 'BusinessInsight'], [64, 'FeatureInsight']] as const) {
            fs.appendFileSync(path.join(directory, `event-${String(index).padStart(2, '0')}.ts`), `
                publicLog2<{ detail: string }, {
                    detail: { classification: 'SystemMetaData'; purpose: '${purpose}'; };
                }>('ConflictingEvent', { detail: '' });
            `);
        }
        const previousExitCode = process.exitCode;
        const previousConsoleError = console.error;
        const errors: string[] = [];
        try {
            process.exitCode = 0;
            console.error = (...args: unknown[]) => errors.push(args.map(String).join(' '));
            await assert.rejects(extractAndResolveDeclarations([{
                sourceDirs: [directory],
                excludedDirs: [],
                parserOptions: {
                    eventPrefix: '',
                    applyEndpoints: true,
                    patchDebugEvents: false,
                    lowerCaseEvents: false,
                    silenceOutput: true,
                    verbose: false
                }
            }]), /Validation failed/);
            assert.ok(errors.some(error => error.includes("Duplicate telemetry event declaration 'ConflictingEvent'")));
            assert.ok(errors.some(error => error.includes('event-00.ts')));
            assert.ok(errors.some(error => error.includes('event-64.ts')));
        } finally {
            process.exitCode = previousExitCode;
            console.error = previousConsoleError;
        }
    });
});
