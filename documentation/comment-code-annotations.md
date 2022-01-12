# Annotating your Code

**NOTE**: If using Typescript we recommend annotating your telemetry events with typings as shown [here](typescript-code-annotations.md)

All telemetry events we send need to be described. For each property of each event we need to know what kind of data they contain and for what reason we collect the data.

Let's assume we send the following event and the timer data is dynamic, i.e. the properties of `timer` can not be known statically:
```ts
logEvent('E1', {
    E1P1: 'activitybar',
    ...f1,
    ...f4,
    timer: {
        waited: 536,
        processing: 43,
        queued: 97,
        elasped: 812
    }
});
```

The event is constructed in multiple steps, normally scattered across several files:
```ts
function logEvent(eventName, eventData) {
    eventData.CP1 = getSQMUserId();
    service.sendEvent(eventName, eventData);
}

let f1 : F1 = { F1P1 : 23 };

let f2 : F2 = { F2P1 : document.getLine(1) };

let f3 : F3 = { F3P1: publisher.displayName };

let f4 : F4 = {
    F4P1: extension.extensionName,
    F4P2: {
        ...f2,
        ...f3
    }
};

logEvent('E1', {
    E1P1: 'activitybar',
    ...f1,
    ...f4,
    timer: {
        waited: 536,
        processing: 43,
        queued: 97,
        elasped: 812
    }
});
```

In order to extract the event descriptions with simple scanners we use specific comments to describe telemetry events and their properties. We place those comments as close as possible to where the events and properties are generated. The code above would be annotated as follows:
```ts
// __GDPR__COMMON__ "CP1" : { "endPoint": "SqmUserId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
function logEvent(eventName, eventData) {
    eventData.CP1 = getSQMUserId();
    service.sendEvent(eventName, eventData);
}

/* __GDPR__FRAGMENT__
   "F1" : {
      "F1P1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
   }
 */
let f1 : F1 = { F1P1 : 23 };

/* __GDPR__FRAGMENT__
   "F2" : {
      "F2P1" : { "classification": "CustomerContent", "purpose": "PerformanceAndHealth" }
   }
 */
let f2 : F2 = { F2P1 : document.getLine(1) };

/* __GDPR__FRAGMENT__
   "F3" : {
      "F3P1" : { "classification": "PublicPersonalData", "purpose": "FeatureInsight" }
   }
 */
let f3 : F3 = { F3P1: publisher.displayName };

/* __GDPR__FRAGMENT__
   "F4" : {
      "F4P1" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
      "F4P2": {
          "${inline}": [
              "${F2}",
              "${F3}"
            ]
        }
   }
 */
let f4 : F4 = {
    F4P1: extension.extensionName,
    F4P2: {
        ...f2,
        ...f3
    }
};

/* __GDPR__
   "E1" : {
      "E1P1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "${include}": [
          "${F1}",
          "${F4}"
        ],
      "${wildcard}": [
         {
            "${prefix}": "timer.",
            "${classification}": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
         }
      ]
   }
 */
logEvent('E1', {
    E1P1: 'activitybar',
    ...f1,
    ...f4,
    timer: {
        waited: 536,
        processing: 43,
        queued: 97,
        elasped: 812
    }
});
```

The GDPR comments are processed and result in the following final description of the `E1` event. Every property that starts with `timer.` -- such as `timer.waited` -- is classified as system metadata that we collect for gaining insights into how the feature is being used.
```json
   "E1" : {
      "E1P1" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "F1P1": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
      "F4P1" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
      "F4P2.F2P1" : { "classification": "CustomerContent", "purpose": "PerformanceAndHealth" },
      "F4P2.F3P1" : { "classification": "PublicPersonalData", "purpose": "FeatureInsight" },
      "${wildcard}": [
         {
            "${prefix}": "timer.",
            "${classification}": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
         }
      ],
      "CP1" : { "endPoint": "SqmUserId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
   }
```

# Syntax
All GDPR comments are tagged with one of the following tags and are otherwise well-formed `JSON`.
- `__GDPR__` - describes the name and the properties of a telemetry event
- `__GDPR__FRAGMENT__` - describes the name and the properties of a fragment of the data of an event, fragments are either included or inlined by other fragments or events
- `__GDPR__COMMON__` - describes a property added to every telemetry event

Each property is described with an object that looks like this:
```ts
{
    endPoint?: "none" | "SqmUserId" | "SqmMachineId",
    classification: "SystemMetaData" | "CustomerContent" | "EndUserPseudonymizedInformation" | "PublicPersonalData" | "PublicNonPersonalData" | "CallstackOrException",
    purpose: "FeatureInsight" | "PerformanceAndHealth" | "BusinessInsight" | "SecurityAndAuditing",
    owner: string,
    comment: string,
    expiration?: string,
    isMeasurement?: Boolean
}
```

If `endPoint` is omitted, it defaults to `none`. That's appropriate for pretty much all properties rather than a couple of common properties.

The values for `classification` are mostly self-explaining. `EndUserPseudonymizedInformation` is what allows us to identify a particular user across time, although we don't know the actual identity of the user. `machineId` or `instanceId` fall in this category. `PublicPersonalData` and `PublicNonPersonalData` is information that users provide us with, for example, publisher information on the marketplace. `CustomerContent` is information the user generated such as urls of repositories or custom snippets. `CallstackOrException` is for error data like callbacks and exceptions. Everything else is `SystemMetaData`.

`purpose` is usually `FeatureInsight` or `PerformanceAndHealth`. We only use `BusinessInsight` for events generated by surveys.

`owner` is used to specify who is responsbile for the telemetry event. 

`comment` is used to specify a reason for collecting the event. This is meant to be more descriptive than `classification` and `purpose`.

`expiration` is used if you would like to dictate the max product version this telemetry event should be sent in. This allows external tools to specify which events should be removed from the codebase.

`isMeasurement` is used if the property is a number. Numbers are handled differently in the telemetry system.

For an event with no properties, define an empty event:
```json
"event" : { }
```
This will be classified as `SystemMetadata` with a purpose of `FeatureInsight`.

## Special constructs
#### ${include}
If A includes B, this is equivalent to the union of A and B. Fragments are referenced using `${FragmentName}`.

#### ${inline}
If A inlines B at property P, all properties of B are added to A under the key `"P.<Name in B>"`. Fragments are referenced using `${FragmentName}`.

#### ${wildcard}
Wildcards can be used as a **temporary** workaround to describe dynamic properties that have a common prefix. In the long run all dynamic properties need to be removed and be sent as values of a static property. A wild card is an array of wildcard entries. Each entry has a `${prefix}` and a `${classification}` property. The value of `${prefix}` is a string representing the common prefix of all properties it matches. The value of `${classification}` is a property description detailed above.
