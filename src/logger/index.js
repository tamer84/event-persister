"use strict";

// Dependencies
// ============================
const bunyan = require('bunyan'),
    path = require('path')
;

/**
 * Creates a logger using the given name (should be the js file name)
 *
 * @param name
 * @returns {*}
 */
function logger(name) {

    return bunyan.createLogger({
        app: process.env.npm_package_name,
        version: process.env.npm_package_version,
        name: path.basename(name),
        streams: [
            {
                level: process.env.LOG_LEVEL || 'INFO',
                stream: process.stdout
            }
        ]
    });
}

exports.logger = logger;
