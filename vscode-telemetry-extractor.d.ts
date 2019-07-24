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
    [key: string]: CommonProperty;
}

export interface CommonProperty {
    name: string;
    classification: string;
    purpose: string;
    endPoint?: string;
    isMeasurement?: boolean;
}

export interface Events {
    [key: string]: Event;
}

export interface Event {
    [key: string]: Properties;
}

export interface Properties {
    [key: string]: Property;
}

export interface Property {
    name: string;
    classification: string;
    purpose: string;
    endPoint?: string;
    isMeasurement?: boolean;
}

/**
 * Extracts and resolves all typescript declarations from a series of different sources into a formatted object
 * @param sourceSpecs The various sources and their options which you would like to extract from
 */
export declare function extractAndResolveDeclarations(sourceSpecs: Array<SourceSpec>): Promise<{ events: Events, commonProperties: CommonProperties }>;

/**
 * Parses a valid extractor config file into an array of sourceSpecs that can be passed into an extract function
 * @param file The path to the configuration file
 */
export declare function convertConfigToSourceSpecs(file: PathLike): SourceSpec[]
