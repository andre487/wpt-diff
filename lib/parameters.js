'use strict';
/**
 * @file
 * Program parameters module
 */

var _ = require('lodash');

var ENV_MAPPING = {
    WPT_API_KEY: {name: 'apiKey'},
    WPT_LOCATION: {name: 'location'},
    WPT_CONNECTIVITY: {name: 'connectivity'},
    WPT_MOBILE: {name: 'mobile', type: _.flow(Number, Boolean)},

    WPT_LABELS: {name: 'labels', type: Array},
    WPT_URLS: {name: 'urls', type: Array}
};

var parameters = exports;

/**
 * Get application params
 * @returns {{urls: String[], apiKey: String}}
 */
parameters.get = function () {
    var params = _.assign({}, parameters.getFromEnv(process.env), parameters.getFromCli());

    if (!_.isArray(params.urls) || !params.urls.length >= 2) {
        throw new Error('No URLS param. Use --url or WPT_URLS');
    }

    return params;
};

/**
 * Get env params
 * @param {Object} env
 * @returns {WPTDiff.Params}
 */
parameters.getFromEnv = function (env) {
    return _.transform(ENV_MAPPING, function (params, envParams, envName) {
        params[envParams.name] = castEnvType(env[envName], envParams.type);
        return params;
    }, {});
};

function castEnvType(val, type) {
    if (!type) {
        return val;
    }

    switch (type) {
        case Array:
            return _.compact(val.split(/\s+/));
        default:
            return type(val);
    }
}

/**
 * Get CLI params
 * @returns {Object}
 */
parameters.getFromCli = function () {
    // TODO: implement
    return {};
};
