var parameters = require('./parameters');
var WPTDiff = require('./wpt-diff');

var params = parameters.get();
var differ = new WPTDiff(params.apiKey);

differ.run(params.urls)
    .then(function (data) {
        console.log('Results:', data);
    })
    .catch(function (err) {
        console.error('Error:', err);
        process.exit(1);
    });
