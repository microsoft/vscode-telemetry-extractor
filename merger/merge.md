# Merging mutliple telemetry files

Place all .json files in the format belows into the merger directory.
```JSON
{
    "events": {
        "eventName": {
            "propertyName": {
                "classification": "CLASSIFICATION",
                "purpose": "PURPOSE"
            }
        }
    },
    "commonProperties": {
        "propertyName": {
            "classification": "CLASSIFICATION",
            "purpose": "PURPOSE"
        }
    }
}
```

Run 
```bash
npm run merge
```

Your files will now be merge into one .json file in the form of: 

```JSON
{
    "fileName": {
        "events": {
            "eventName": {
                "propertyName": {
                    "classification": "CLASSIFICATION",
                    "purpose": "PURPOSE"
                }
            }
        },
        "commonProperties": {
            "propertyName": {
                "classification": "CLASSIFICATION",
                "purpose": "PURPOSE HERE"
            }
        }
    }
}
```

Note: files that end in .json will be ignored and subsequent runs of `npm run merge` will cause the old one to be deleted.