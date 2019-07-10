// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * The options which the parser takes in
 * evenetPrefix: The prefix to append to all telemetry event names
 * includeIsMeasurement: Whether or not to include the isMeasurement property on events in the final report
 * applyEndpoints: Whether to include the endPoints property on events in the final report
 */
export interface ParserOptions {
    eventPrefix: string;
    includeIsMeasurement: boolean;
    applyEndpoints: boolean;
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

/**
 * Extracts and resolves all typescript declarations into an object
 * @param sourceDirs The directories to extract telemetry from
 * @param excludedDirs The directories within the source dirs to exclude from extraction
 * @param options The parser options to use when parsing the code
 */
export declare function extractAndResolveDeclarations(sourceDirs: Array<string>, excludedDirs: Array<string>, options: ParserOptions): Promise<{events: any, commonProperties: any}>;


/**
 * Extracts and resolves all typescript declarations from a series of different sources into a formatted object
 * @param sourceSpecs The various sources and their options which you would like to extract from
 */
export declare function extractAndResolveExtensionDeclarations(sourceSpecs: Array<SourceSpec>): Promise<{events: any, commonProperties: any}>;
