'use strict';
/**
 * @file
 * Program parameters module
 */

var _ = require('lodash');
var ArgumentParser = require('argparse').ArgumentParser;

var ENV_MAPPING = {
    WPT_API_KEY: {name: 'apiKey'},
    WPT_HOST: {name: 'host'},

    WPT_LOCATION: {name: 'location'},
    WPT_CONNECTIVITY: {name: 'connectivity'},
    WPT_MOBILE: {name: 'mobile', type: _.flow(Number, Boolean)},

    WPT_LABELS: {name: 'labels', type: Array},
    WPT_URLS: {name: 'urls', type: Array}
};

var parameters = exports;
var packageInfo = require('../package.json');

/**
 * Get application params
 * @returns {WPTDiff.Params}
 */
parameters.get = function getProgramParameters() {
    var cliParams = parameters.getFromCli(parameters.getRawCliArgs());
    var envParams = parameters.getFromEnv(parameters.getEnvVars());

    var params = _.transform(cliParams, function (params, val, key) {
        if (val) {
            params[key] = val;
        } else if (envParams[key]) {
            params[key] = envParams[key];
        }
        return params;
    }, {});

    if (!_.isArray(params.urls) || !params.urls.length >= 2) {
        throw new Error('No URLS param. Use --url or WPT_URLS');
    }

    if (params.labels && params.labels.length != params.urls.length) {
        throw new Error('Labels count must be equal urls count');
    }

    return params;
};

/**
 * Get raw CLI arguments
 * @returns {Array<String>}
 */
parameters.getRawCliArgs = function getRawCliArgs() {
    return process.argv.slice(2);
};

/**
 * Get process ENV
 * @returns {Object}
 */
parameters.getEnvVars = function getEnvVars() {
    return process.env;
};

/**
 * Get env params
 * @param {Object} env
 * @returns {WPTDiff.Params}
 */
parameters.getFromEnv = function getProgramParametersFromEnv(env) {
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
            return val ? _.compact(val.split(/\s+/)) : [];
        default:
            return type(val);
    }
}

/**
 * Get CLI params
 *
 * @param {String[]} argv
 *
 * @returns {Object}
 */
parameters.getFromCli = function getProgramParametersFromCli(argv) {
    var argParser = new ArgumentParser({
        version: packageInfo.version,
        addHelp: true,
        description: packageInfo.description,
        epilog: 'Program documentation: ' + packageInfo.readme
    });

    argParser.addArgument(
        ['--api-key'],
        {dest: 'apiKey', help: 'WebPageTest API key. Env: WPT_API_KEY'}
    );

    argParser.addArgument(
        ['--host'],
        {dest: 'host', defaultValue: 'www.webpagetest.org',
            help: 'WebPageTest host, default: www.webpagetest.org. Env: WPT_HOST'}
    );

    argParser.addArgument(
        ['--location'],
        {dest: 'location', help: 'Test server location. Env: WPT_LOCATION'}
    );

    argParser.addArgument(
        ['--connectivity'],
        {dest: 'connectivity', help: 'Connection type for tests. Env: WPT_CONNECTIVITY'}
    );

    argParser.addArgument(
        ['--mobile'],
        {dest: 'mobile', action: 'storeTrue', help: 'Test with mobile device emulation. Env: WPT_MOBILE'}
    );

    argParser.addArgument(
        ['--label'],
        {dest: 'labels', action: 'append', help: 'Labels for tests. Can be passed N times. Env: WPT_LABELS'}
    );

    argParser.addArgument(
        ['--url'],
        {dest: 'urls', action: 'append', help: 'URLs for tests. Can be passed N times. Env: WPT_URLS'}
    );

    return argParser.parseArgs(argv);
};
