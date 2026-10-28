// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Fragment, Fragments } from "./fragments";
import { DeclaredProperty, Events, Include, Inline } from "./events";
import { CommonProperties, Property } from "./common-properties";
import { logMessage } from "./logger";
import type { ExtractedDeclarations } from "../../vscode-telemetry-extractor";

export interface Declarations {
    fragments: Fragments;
    events: Events;
    commonProperties: CommonProperties;
}

// We don't output Fragments as they don't really provide much context on their own
export type OutputtedDeclarations = ExtractedDeclarations;

class FragmentResolver {
    private readonly fragments: Map<string, Fragment>;
    public readonly used = new Set<string>();
    public readonly errors: string[] = [];

    constructor(fragments: Fragments) {
        this.fragments = new Map(fragments.dataPoints.map(fragment => [fragment.name, fragment]));
    }

    /**
     * Replaces `${include}` and `${inline}` references with the properties of the referenced fragments.
     * Directly declared properties come first, so they win over fragment properties of the same name.
     */
    public expand(properties: readonly DeclaredProperty[], owner: string, stack: readonly string[] = []): DeclaredProperty[] {
        const declared: DeclaredProperty[] = [];
        const inlined: DeclaredProperty[] = [];
        const included: DeclaredProperty[] = [];
        for (const property of properties) {
            if (property instanceof Include) {
                for (const reference of property.includeNames) {
                    const fragment = this.lookup(reference, owner, stack);
                    if (fragment) {
                        included.push(...this.expand(fragment.properties, owner, [...stack, fragment.name]));
                    }
                }
            } else if (property instanceof Inline) {
                for (const reference of property.inlines) {
                    const fragment = this.lookup(reference, owner, stack);
                    if (fragment) {
                        // Inlined fragments contribute their properties, prefixed with the inline name
                        for (const inlinedProperty of this.expand(fragment.properties, owner, [...stack, fragment.name])) {
                            if (inlinedProperty instanceof Property) {
                                inlined.push(inlinedProperty.withName(`${property.inlineName}.${inlinedProperty.name}`));
                            }
                        }
                    }
                }
            } else {
                declared.push(property);
            }
        }
        return [...declared, ...inlined, ...included];
    }

    private lookup(reference: string, owner: string, stack: readonly string[]): Fragment | undefined {
        const name = /^\$\{(.*)\}$/.exec(reference)?.[1] ?? reference;
        const fragment = this.fragments.get(name);
        if (!fragment) {
            this.errors.push(`Unresolved fragment reference '${reference}' in ${owner}`);
            return undefined;
        }
        if (stack.includes(name)) {
            this.errors.push(`Fragment '${name}' includes itself (${[...stack, name].join(' > ')}) in ${owner}`);
            return undefined;
        }
        this.used.add(name);
        return fragment;
    }
}

/** Expands a fragment the way an event which includes it sees it. */
export function expandFragment(fragments: Fragments, name: string) {
    const resolver = new FragmentResolver(fragments);
    const properties = resolver.expand([new Include([`\${${name}}`])], `fragment '${name}'`);
    return { properties, errors: resolver.errors };
}

/**
 * Resolves the fragments referenced by every event.
 * @returns The declarations with resolved events, and an error for every reference which could not be resolved
 */
export function resolveDeclarations(declarations: Declarations, verbose: boolean) {
    const resolver = new FragmentResolver(declarations.fragments);
    for (const event of declarations.events.dataPoints) {
        const location = event.location ? ` at ${event.location.replace(/\\/g, '/')}` : '';
        event.properties = resolver.expand(event.properties, `event '${event.name}'${location}`);
    }
    if (verbose) {
        const unused = declarations.fragments.dataPoints.map(fragment => fragment.name).filter(name => !resolver.used.has(name));
        logMessage(`Unused Fragments: ${unused.length > 0 ? [...new Set(unused)] : ['None']}`);
    }
    return { ...declarations, errors: resolver.errors };
}
