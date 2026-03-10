export interface IPropertyData {
	classification: 'SystemMetaData' | 'CallstackOrException' | 'CustomerContent' | 'PublicNonPersonalData' | 'EndUserPseudonymizedInformation';
	purpose: 'PerformanceAndHealth' | 'FeatureInsight' | 'BusinessInsight';
	comment: string;
	expiration?: string;
	endpoint?: string;
}

export interface TableInfo {
	name: string;
	commonProperties?: string;
	backfill?: boolean;
}

export interface IGDPRProperty {
	owner: string;
	comment: string;
	expiration?: string;
	$tableInfo?: TableInfo;
	readonly [name: string]: IPropertyData | undefined | IGDPRProperty | string | TableInfo;
}

type IGDPRPropertyWithoutMetadata = Omit<IGDPRProperty, 'owner' | 'comment' | 'expiration' | '$tableInfo'>;
export type OmitMetadata<T> = Omit<T, 'owner' | 'comment' | 'expiration' | '$tableInfo'>;

export type ClassifiedEvent<T extends IGDPRPropertyWithoutMetadata> = {
	[k in keyof T]: unknown;
};

export type StrictPropertyChecker<TEvent, TClassification, TError> = keyof TEvent extends keyof OmitMetadata<TClassification> ? keyof OmitMetadata<TClassification> extends keyof TEvent ? TEvent : TError : TError;

export type StrictPropertyCheckError = { error: 'Type of classified event does not match event properties' };

export type StrictPropertyCheck<T extends IGDPRProperty, E> = StrictPropertyChecker<E, ClassifiedEvent<OmitMetadata<T>>, StrictPropertyCheckError>;

// The TS parser is looking for two commands, publicLog2 and publicLogError2. They both represent the same thing
export function publicLog2<E extends ClassifiedEvent<OmitMetadata<T>> = never, T extends IGDPRProperty = never>(eventName: string, data?: StrictPropertyCheck<T, E>): void {
    return;
}

export function publicLogError2<E extends ClassifiedEvent<OmitMetadata<T>> = never, T extends IGDPRProperty = never>(eventName: string, data?: StrictPropertyCheck<T, E>): void {
    return;
}