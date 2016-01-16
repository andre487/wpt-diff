'use strict';
var parameters = require('./parameters');
var prepareReport = require('./report');
var wptDiff = require('./wpt-diff');

var params = parameters.get();

wptDiff(params.urls, params.apiKey)
    .then(function (data) {
        console.log(prepareReport(data));
    })
    .catch(function (err) {
        console.error(err.stack);
        process.exit(1);
    });
