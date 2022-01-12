# Using Typescript to annotate your Typescript Code

As shown in [GDPR formatted comments](comment-code-annotations.md) telemetry events can be documented in the form of hand written JSON comments.
This form of documentation has its pros and cons, one of the major cons which is human error. Comments do not offer any computer assisted protection agianst things like simple typos while typings do.

## Declaring your telemetry handler
We recommend declaring your telemetry handler the same way VS Code does as the parser explicity looks for a function called publicLog2 which is templated
and takes two types, the event and the classification.

```typescript
interface IPropertyData {
    classification: 'SystemMetaData' | 'CallstackOrException';
    purpose: 'PerformanceAndHealth' | 'FeatureInsight';
    owner: string;
    comment: string;
    expiration?: string;
    endpoint?: string;
    isMeasurement?: boolean;
}

interface IGDPRProperty {
    readonly [name: string] : IPropertyData | undefined | IGDPRProperty;
}

type ClassifiedEvent<T extends IGDPRProperty> = {
    [k in keyof T]: any
}

type StrictPropertyCheck<TEvent, TClassifiedEvent, TError> = keyof TEvent extends keyof TClassifiedEvent ? keyof TClassifiedEvent extends keyof TEvent ? TEvent : TError : TError;

function publicLog2<E extends ClassifiedEvent<T> = never, T extends {[_ in keyof T]: IPropertyData | IGDPRProperty | undefined} = never>(name: string, props: StrictPropertyCheck<E, ClassifiedEvent<T>, 'Type of classified event does not match event properties'>) { }
```

## Simple Events
Previously the annotation for the event monacoworkbench/packagemetrics looked like this:
```ts
    /* __GDPR__
        "monacoworkbench/packagemetrics" : {
            "commit" : {"classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
            "size" : {"classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
            "count" : {"classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
        }
    */
```

With typescript annotations the event would be annotated like this:
```ts
type PackageMetricsClassification =  {
    commit: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
    size: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
    count: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
};
```

You would then need to declare a type for the event you're sending and send the event

```ts
interface PackageMetrics {
    commit: string;
    size: number;
    count: number;
};
publicLog2<PackageMetrics, PackageMetricsClassification>('monacoworkbench/packagemetrics', packageMetric);
// Inline works too
publicLog2<PackageMetrics, PackageMetricsClassification>('monacoworkbench/packagemetrics', {commit: 'abcdef', size: 10, count: 1});
```

This form of annotation requires that the type of event sent and its classification match in terms of properties and that the classification is a valid classification.

## Includes
Includes were previously annotated like this:
```ts
    /* __GDPR__FRAGMENT__
        "TypeScriptCommonProperties" : {
            "version" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        }
    */

    /* __GDPR__
        "tsserver.exitWithCode" : {
            "code" : { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
            "${include}": [
                "${TypeScriptCommonProperties}"
            ]
        }
    */
```

With using typings as annotations an include is effectively the extends keyword or an intersect type. The typing annotation is as follows

```ts
    type TypeScriptCommonPropertiesClassification = {
        version: {classification: 'SystemMetaData', purpose: 'FeatureInsight'};
    };

    // The intersect type signifies the include
    type TSServeExitWithCodeClassification  = {
        code: {classification: 'CallstackOrException', purpose: 'PerformanceAndHealth'};
    } & TypeScriptCommonPropertiesClassification;
```

The event is then given a type and sent just like the event above
```ts
    interface TSServerExitCode {
        code: number;
        version: number;
    };

    const tsServerEvent: TSServerExitCode = {
        code: 0,
        version: 3.5
    };

    publicLog2<TSServerExitCode, TSServeExitWithCodeClassification>('tsserver.exitWithCode', tsServerEvent);
    publicLog2<TSServerExitCode, TSServeExitWithCodeClassification>('tsserver.exitWithCode', {code: 0, version: 3.5});
```

## Inlines
Inlines were previously annotated like so:
```ts
    /* __GDPR__FRAGMENT__
        "ExtensionIdentifier" : {
            "id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "uuid": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        }
    */

    /* __GDPR__
        "disableOtherKeymaps" : {
            "newKeymap": { "${inline}": [ "${ExtensionIdentifier}" ] },
            "oldKeymaps": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "confirmed" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        }
    */
```

Inlines can be thought of as composition and therefore can be defined as a type containing another type

```ts
    type ExtensionIdentifierClassifcation = {
        id: {classification: 'SystemMetaData', purpose: 'FeatureInsight'};
        uuid: {classification: 'SystemMetaData', purpose: 'FeatureInsight'};
    };

    type DisableOtherKeymapsClassification = {
        newKeyMap: ExtensionIdentifierClassifcation;
        oldKeyMaps: {classification: 'SystemMetaData', purpose: 'FeatureInsight'};
        confirmed: {classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true};
    };
```

The process of defining and sending the event are the same as the previous two

```ts
    interface ExtensionIdentifier {
        id: number;
        uuid: number;
    };

    interface DisableOtherKeymaps {
        newKeyMap: ExtensionIdentifier;
        oldKeyMaps: string;
        confirmed: boolean;
    };

    const extensionIdentifierFragment: ExtensionIdentifier = {
        id: 1,
        uuid: 1234
    };

    const disableKeymapsEvent: DisableOtherKeymaps = {
        newKeyMap: extensionIdentifierFragment,
        oldKeyMaps: 'abcd',
        confirmed: true
    };

    publicLog2<DisableOtherKeymaps, DisableOtherKeymapsClassification>('disableOtherKeymaps', disableKeymapsEvent);
```

## Currently Not Supported

* Wildcards
* Common Properties
* Anything else not defined above

To get around the not supported features we recommend annotating those with comments as the extractor will fall back on those provided no type annotations are provided.

