const os = require('os');

module.exports = (...lines) => lines.join(os.EOL);
