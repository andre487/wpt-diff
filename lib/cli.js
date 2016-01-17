'use strict';
/**
 * @file
 * Command line interface script
 */

var logger = require('./log');
var parameters = require('./parameters');
var prepareReport = require('./report');
var wptDiff = require('./wpt-diff');

var params = parameters.get();

wptDiff(params)
    .then(function (data) {
        console.log(prepareReport(data));
    })
    .catch(function (err) {
        logger.error(err);
        process.exit(1);
    });
