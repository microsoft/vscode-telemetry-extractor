# Generate Telemetry JSON Files

The inventories will be generated as `json` files. They have the following basic structure:
```json
{
    "events": {
        "<eventName>": {
            "<propertyName>": {
                "classification": "SystemMetaData",
                "purpose": "FeatureInsight",
                "endPoint": "none"
            },
            "<propertyName>": {
                "classification": "SystemMetaData",
                "purpose": "PerformanceAndHealth",
                "isMeasurement": true,
                "endPoint": "none"
            }
        },
        ...
    },
    "commonProperties": {
        "<commonPropertyName>": {
            "classification": "SystemMetaData",
            "purpose": "FeatureInsight",
            "endPoint": "none"
        },
        ...
    }
}
```

Note: If the code annotations have syntax errors, the inventory generation will fail.

## VS Code Core (no built-in extensions)
To get the telemetry which just the VS Code core collects

```bash
   npm run extract-core
```
This will generate output similar to:
```bash
....running.
...extracting
...writing /Users/lramos/vscode-telemetry-extractor/declarations-resolved.json
```

This creates a JSON file in `./declarations-resolved.json`. The JSON is formatted with 4 spaces as indentation by default.


## VS Code Extensions

To generate an telemetry file for VS Code extensions (built-in and those that are maintained by VS Code).

```bash
   npm run extract-extensions
```

This will generate output similar to:
```bash
...running
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...extracting
...writing /Users/lramos/vscode-telemetry-extractor/declarations-extensions-resolved.json
```

This creates the inventory in `./declarations-extensions-resolved.json`. The JSON is formatted with 4 spaces as indetation by default

## Extracting Both

To generate a telemetry file for both.

```bash
    npm run extract-all
```

This will just just run the two commands specified together.

# Other Functionalities

## Cleaning up your folder

To clean up your folder after using the tool, two commands are provided.

### Clean

To delete just the generated JSON.

```bash
    npm run clean
```

### Clean all

To delete both the generated JSON and the cloned repositories

```bash
    npm run clean-all
```

## Running Tests

If you wish to make contributions to this tool, a few tests are provided to ensure there are no regressions. We also urge that you 
add tests to ensure that any code you add doesn't break as well.

```bash
    npm run test
```