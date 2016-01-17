'use strict';
/**
 * @file
 * Command line interface script
 */

var parameters = require('./parameters');
var prepareReport = require('./report');
var wptDiff = require('./wpt-diff');

var params = parameters.get();

wptDiff(params)
    .then(function (data) {
        console.log(prepareReport(data));
    })
    .catch(function (err) {
        console.error(err.stack);
        process.exit(1);
    });
