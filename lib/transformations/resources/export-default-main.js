
function defaultAsModule(mod) {
    if (!mod.default) {
        return mod;
    }
    const def = mod.default;
    for (const [name, entry] of Object.entries(def)) {
        if (Object.prototype.hasOwnProperty.call(def, name)) {
            // don't warn about already exported entries
            if (def[name] !== entry) {
                process.emitWarning(`default export already has ${name} property - not exporting`);
            }
        } else {
            def[name] = entry;
        }
    }
    return def;
}

module.exports = defaultAsModule(require('$$package-main$$'))
