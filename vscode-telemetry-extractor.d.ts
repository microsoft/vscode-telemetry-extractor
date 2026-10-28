// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PathLike } from "fs";
/**
 * The options which the parser takes in
 * evenetPrefix: The prefix to append to all telemetry event names
 * applyEndpoints: Whether to include the endPoints property on events in the final report
 */
export interface ParserOptions {
    eventPrefix: string;
    applyEndpoints: boolean;
    patchDebugEvents: boolean;
    lowerCaseEvents: boolean;
    silenceOutput: boolean;
    verbose: boolean;
}

/**
 * Allows specifying different options for groups of sources
 * sourceDirs: The directories to extract from
 * excludedDirs: The sub directories to exclude from the telemetry extraction
 * parserOptions: The parser options to apply to these set of directories
 */
export interface SourceSpec {
    sourceDirs: string[],
    excludedDirs: string[],
    parserOptions: ParserOptions
}

export interface CommonProperties {
    [key: string]: Property;
}

export interface Events {
    [key: string]: Event;
}

export interface Event {
    [key: string]: Property | string | undefined;
    comment?: string;
    expiration?: string;
}

export interface Property {
    comment?: string;
    expiration?: string;
    classification: string;
    purpose: string;
    endPoint?: string;
    isMeasurement?: boolean;
    column?: { name?: string; type: string };
}

export type ColumnType =
    'bool' |
    'int' |
    'long' |
    'real' |
    'decimal' |
    'dynamic' |
    'guid' |
    'string' |
    'datetime' |
    'timespan';

export interface TableInfo {
    name: string;
    commonProperties: 'standard';
    backfill: boolean | string;
    columns: { name: string; type: ColumnType; bag: { store: 'Measures' | 'Properties'; name: string }}[];
}

export interface ExtractedDeclarations {
    events: Events;
    commonProperties: CommonProperties;
    /** Flat Kusto table information, keyed by table name */
    tableInfos: { [tableName: string]: TableInfo };
}

/**
 * Extracts and resolves all telemetry declarations from a series of different sources into a formatted object.
 * Duplicate declarations of an event are merged; the promise rejects if they disagree on any field,
 * if an annotation cannot be parsed, or if a source directory does not exist.
 * @param sourceSpecs The various sources and their options which you would like to extract from
 */
export declare function extractAndResolveDeclarations(sourceSpecs: Array<SourceSpec>): Promise<ExtractedDeclarations>;

/**
 * Parses a valid extractor config file into an array of sourceSpecs that can be passed into an extract function
 * @param file The path to the configuration file
 * @throws If the file cannot be read or is not a valid configuration
 */
export declare function convertConfigToSourceSpecs(file: PathLike): SourceSpec[]
