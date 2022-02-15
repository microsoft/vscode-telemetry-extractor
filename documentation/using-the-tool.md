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


## Viewing what the command has to offer
```bash
vscode-telemetry-extractor --help
Allows the extraction of telemetry annotation from code. For more details please read: https://github.com/microsoft/vscode-telemetry-extractor/blob/master/README.md

-s --sourceDir                          The folder which you want to extract telemetry from
-x --excludedDir                        A subdirectory which you would like to exclude from the extraction
-c --config                             A JSON Configuration file containing extraction details
-o --outputDir                          The directory which you would like the outputted JSON file to be placed in
-p --eventPrefix                        The string you wish to prepend to every telemetry event.
-f --fileName                           The name of the file you want to output.
-h --help                               Displays the help dialog which provides more information on how to use the tool
```

## Extracting telemetry events
To extract telemetry events from your code you must provide a source directory and output directory.
The source directory is the folder containing the code which you wish to extract the events. The output directory is the location which the resulting JSON report will be placed.

```bash
   vscode-telemetry-extractor -s PATH_TO_YOUR_CODE -o PATH_TO_PLACE_JSON
```
This will generate output similar to:
```bash
....running.
...extracting
...writing <OUTPUTDIR>/declarations-resolved.json
```

## Using a config file
The extractor also supports config files which can be passed in via a command line arguments to customize the way the tool parses.
An example config file can be found below. Note: `sourceDirs` and `excludedDirs` must be made relative to the `workingDir`
```json
[
    {
        "eventPrefix": "typescript-language-features/",
        "workingDir": "/Users/lramos/vscode-telemetry-extractor/src/telemetry-sources",
        "sourceDirs": [
            "vscode/extensions/typescript-language-features",
            "Typescript"
        ],
        "excludedDirs": [],
        "applyEndpoints": true
    },
    {
        "eventPrefix": "msjsdiag.chrome/",
        "workingDir": "/Users/lramos/vscode-telemetry-extractor/src/telemetry-sources",
        "sourceDirs": [
            "vscode-chrome-debug-core",
            "vscode-chrome-debug"
        ],
        "excludedDirs": [],
        "applyEndpoints": true,
        "lowerCaseEvents": true
    }
]
```

Some defaults:
1. If no working directory is provided it will use your current working directory
2. `excludedDirs` defaults to an empty array
3. If the working directory provided is relative it must be relative to the current working directory

# Other Functionalities

## Running Tests

If you wish to make contributions to this tool, a few tests are provided to ensure there are no regressions. We also urge that you 
add tests to ensure that any code you add doesn't break as well.

```bash
    npm run test
```
