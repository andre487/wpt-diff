var _ = require('lodash');

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
 * @returns {Object}
 */
parameters.getFromEnv = function (env) {
    var params = {};

    env.WPT_API_KEY && (params.apiKey = env.WPT_API_KEY);
    env.WPT_URLS && (params.urls = env.WPT_URLS.split(/\s+/));

    return params;
};

/**
 * Get CLI params
 * @returns {Object}
 */
parameters.getFromCli = function () {
    // TODO: implement
    return {};
};
