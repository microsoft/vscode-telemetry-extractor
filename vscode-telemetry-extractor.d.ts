
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
 * Extracts and resolves all typescript declarations into an object
 * @param sourceDirs The directories to extract telemetry from
 * @param excludedDirs The directories within the source dirs to exclude from extraction
 * @param options The parser options to use when parsing the code
 */
export declare function saveDeclarations(sourceDirs: Array<string>, excludedDirs: Array<string>, options: ParserOptions): Promise<object>;