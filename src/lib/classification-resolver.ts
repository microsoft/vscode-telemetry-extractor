// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Node, Symbol, Type, ts } from 'ts-morph';
import { Dictionary, isDictionary } from './object-utils';

const metadataNames = new Set(['owner', 'comment', 'expiration']);

/** Returns the value of a string or boolean literal type. */
function literalValue(type: Type): string | boolean | undefined {
    if (type.isStringLiteral()) {
        return String(type.getLiteralValue());
    }
    if (type.isBooleanLiteral()) {
        return type.getText() === 'true';
    }
    return undefined;
}

function isObjectLike(type: Type) {
    return type.isObject() || type.isIntersection();
}

/**
 * Whether the type is impossible. Intersected object types reduce to `never` when they declare a literal
 * differently, such as two `owner`s or two property `comment`s; the intersection then has no properties.
 */
export function isImpossible(type: Type) {
    return type.isNever() ||
        (type.isIntersection() && type.getProperties().length === 0 && type.getIntersectionTypes().some(part => part.getProperties().length > 0));
}

/** Whether TypeScript could not resolve the type, for example because of a missing import. */
export function isUnresolved(type: Type) {
    return type.isAny() || type.isUnknown();
}

/**
 * Whether data of this type is sent as a measurement. VS Code sends numbers and booleans as measurements.
 * Optional data is sent like required data, so strict null checks must not change the result.
 */
export function isMeasurement(type: Type): boolean {
    const sentType = type.getNonNullableType();
    if (sentType.isNumber() || sentType.isBoolean()) {
        return true;
    }
    if (sentType.isEnum() || sentType.isEnumLiteral()) {
        // Members may be literals (`A = 1`) or computed (`A = 1 << 0`)
        const members = sentType.isUnion() ? sentType.getUnionTypes() : [sentType];
        return members.every(member => (member.getFlags() & ts.TypeFlags.NumberLike) !== 0);
    }
    return false;
}

/**
 * Resolves the classification type argument of a `publicLog2` call to the event's metadata and properties.
 *
 * - Top level `owner`, `comment` and `expiration` string literals are event metadata.
 * - A member whose fields are literals (`classification`, `purpose`, `comment`, ...) is a property.
 * - A member whose fields are themselves properties is an inline group: `group: { a: {...} }` yields `group.a`.
 *   The group's `owner`, `comment` and `expiration` apply to properties which do not declare their own.
 * - A `column` field without a classification holds flat table column metadata for its property.
 */
export class ClassificationResolver {
    public readonly errors: string[] = [];

    /**
     * @param location The call, where types are resolved
     * @param description Describes the event in error messages
     */
    constructor(private readonly location: Node, private readonly applyEndpoints: boolean, private readonly description: string) { }

    public resolve(classification: Type): Dictionary {
        const event: Dictionary = Object.create(null);
        for (const member of classification.getProperties()) {
            const declaredName = member.getName();
            const type = this.typeOf(member);
            const literal = literalValue(type);
            if (literal !== undefined) {
                if (typeof literal === 'string' && metadataNames.has(declaredName)) {
                    event[declaredName] = literal;
                }
                continue;
            }
            const name = declaredName.toLowerCase();
            for (const [propertyName, property] of this.resolveProperty(name, type)) {
                event[propertyName] = property;
            }
            if (isDictionary(event[name])) {
                captureColumnName(declaredName, event[name] as Dictionary);
            }
        }
        return event;
    }

    private typeOf(symbol: Symbol): Type {
        return symbol.getTypeAtLocation(this.location).getNonNullableType();
    }

    private resolveProperty(name: string, type: Type, defaults: Dictionary = {}): [string, Dictionary][] {
        if (isImpossible(type)) {
            this.errors.push(`The classification of property '${name}' ${this.description} is impossible (never). It is probably declared by several intersected classification types with different values.`);
            return [];
        }
        if (isUnresolved(type) || !isObjectLike(type)) {
            this.errors.push(`The classification of property '${name}' ${this.description} could not be resolved: ${type.getText()}`);
            return [];
        }
        const fields: Dictionary = Object.create(null);
        const nested: Symbol[] = [];
        for (const field of type.getProperties()) {
            const fieldName = field.getName();
            const fieldType = this.typeOf(field);
            const value = literalValue(fieldType);
            if (value !== undefined) {
                if (fieldName.toLowerCase() !== 'endpoint') {
                    fields[fieldName] = value;
                } else if (this.applyEndpoints) {
                    fields.endPoint = value;
                }
            } else if (fieldName === 'column' && isObjectLike(fieldType) && !fieldType.getProperty('classification')) {
                fields.column = this.resolveColumn(fieldType);
            } else {
                nested.push(field);
            }
        }
        if (nested.length === 0) {
            for (const [field, value] of Object.entries(defaults)) {
                fields[field] ??= value;
            }
            if (this.applyEndpoints) {
                fields.endPoint ??= 'none';
            }
            return [[name, fields]];
        }
        const groupDefaults: Dictionary = { ...defaults };
        const classificationFields: string[] = [];
        for (const [field, value] of Object.entries(fields)) {
            if (metadataNames.has(field)) {
                groupDefaults[field] = value;
            } else {
                classificationFields.push(field);
            }
        }
        if (classificationFields.length > 0) {
            this.errors.push(`Property '${name}' ${this.description} mixes classification fields (${classificationFields.join(', ')}) with nested properties (${nested.map(field => field.getName()).join(', ')})`);
            return [];
        }
        return nested.flatMap(child => this.resolveProperty(`${name}.${child.getName().toLowerCase()}`, this.typeOf(child), groupDefaults));
    }

    private resolveColumn(type: Type): Dictionary {
        const column: Dictionary = Object.create(null);
        for (const field of type.getProperties()) {
            const value = literalValue(this.typeOf(field));
            if (typeof value === 'string') {
                column[field.getName()] = value;
            }
        }
        return column;
    }
}

/** Flat table columns default to the property name as declared, before it is lowercased. */
function captureColumnName(declaredName: string, property: Dictionary) {
    if (isDictionary(property.column) && property.column.name === undefined) {
        property.column.name = declaredName;
    } else if (typeof property.type === 'string') {
        property.column = { name: declaredName, type: property.type };
        delete property.type;
    }
}
