# dist-package

Add as a dev dependancy then use dist-package in your build scripts

## Commands

### Package

This will copy the given packages json file into the dist folder, stripping scripts and devDependencies out.
It will also shim the main import to export transpiled es6 default exports to be behave line commonjs.

Run `dist-package package --help` for more information

### Clean

This will delete the given folder and all it's contents be careful.

Run `dist-package clean --help` for more information

### Help

Displays help

## Example scripts entry

```
{
    "scripts": {
        "dist:clean": "dist-package clean",
        "dist:package": "dist-package package",
        "build:tsc": "tsc --declaration true --outDir dist/lib",
        "build": "yarn dist:clean && yarn build:tsc && yarn dist:package"
    }
}
```
