/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
interface IPropertyData {
    classification: 'SystemMetaData' | 'CallstackOrException' | 'CustomerContent' | 'PublicNonPersonalData';
    purpose: 'PerformanceAndHealth' | 'FeatureInsight' | 'BusinessInsight';
    expiration?: string;
    owner?: string;
    comment?: string;
    endpoint?: string;
    isMeasurement?: boolean;
}

interface IGDPRProperty {
    readonly [name: string]: IPropertyData | undefined | IGDPRProperty;
}

type ClassifiedEvent<T extends IGDPRProperty> = {
    [k in keyof T]: any
};

type StrictPropertyChecker<TEvent, TClassifiedEvent, TError> = keyof TEvent extends keyof TClassifiedEvent ? keyof TClassifiedEvent extends keyof TEvent ? TEvent : TError : TError;

type StrictPropertyCheckError = 'Type of classified event does not match event properties';

type StrictPropertyCheck<T extends IGDPRProperty, E> = StrictPropertyChecker<E, ClassifiedEvent<T>, StrictPropertyCheckError>;

type GDPRClassification<T> = { [_ in keyof T]: IPropertyData | IGDPRProperty | undefined };

// The TS parser is looking for two commands, publicLog2 and publicLogError2. They both represent the same thing
export function publicLog2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>, anonymizeFilePaths?: boolean): void {
    return;
}

export function publicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>, anonymizeFilePaths?: boolean): void {
    return;
}