function defaultAsModule(mod) {
    if (!mod.__esModule || !mod.default) {
        return mod;
    }

    const def = mod.default;
    for (const [name, entry] of Object.entries(mod)) {
        if (Object.prototype.hasOwnProperty.call(def, name)) {
            if (def[name] !== entry) {
                process.emitWarning(
                    `default export already has ${name} property - not exporting`
                );
            }
            // this is no longer an es module so skip that entry
        } else if (name !== '__esModule') {
            def[name] = entry;
        }
    }
    return def;
}

module.exports = defaultAsModule(require('$$package-main$$'));
