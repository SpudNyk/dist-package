# dist-utils

Add as a dev dependancy then use dist-utils in your build scripts

## Commands

### Package

This will copy the given packages json file into the dist folder, stripping scripts and devDependencies out.
It will also shim the main import to export transpiled es6 default exports to be behave line commonjs.

### Clean

This will delete the given folder and all it's contents be careful.

## Example scripts entry

```
{
    "scripts": {
        "dist:clean": "dist-utils clean dist",
        "dist:package": "dist-utils package . dist",,
        "build:tsc": "tsc --declaration true --outDir dist/lib",
        "build": "yarn dist:clean && yarn build:tsc && yarn dist:package"
    }
}
```
