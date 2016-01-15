var ask = require('vow-asker');
var Q = require('q');
var WebPageTest = require('webpagetest');
var _ = require('lodash');

var httpResources = require('./http-resources');

module.exports = WTPDiff;

/**
 * Compare object constructor
 * @param {String} [host] service host
 * @param {String} [apiKey]
 * @constructor
 */
function WTPDiff(host, apiKey) {
    if (arguments.length == 1) {
        apiKey = host;
        host = null;
    }
    host = host || this.DEFAULT_SERVICE_HOST;
    this.wpt = new WebPageTest(host, apiKey);
}

_.assign(WTPDiff.prototype, /** @lends WTPDiff.prototype */ {
    DEFAULT_SERVICE_HOST: 'www.webpagetest.org',

    COMPLETE_POLLING_INTERVAL: 1000,

    TEST_OPTIONS: {
        video: true
    },

    /**
     * Run compare
     * @param {String[]} urls
     * @returns {Promise<Object>}
     */
    run: function (urls) {
        return this.runTests(urls)
            .then(_.bind(this.createVideo, this))
            .then(_.bind(this.getVideoPlayerUrl, this));
    },

    /**
     * Run pages tests
     * @param {String[]} urls
     * @returns {Promise<Object>} Test results, see https://clck.ru/9fX69
     */
    runTests: function (urls) {
        var that = this;

        var testPromises = urls.map(function (url) {
            return Q.ninvoke(that.wpt, 'runTest', url, that.TEST_OPTIONS);
        });

        function waitComplete(testsDataList) {
            var allReaders = testsDataList.map(function (testData) {
                return _.bind(that.getTestStatus, that, testData.data.testId);
            });

            return httpResources.readResourceWhenReady(allReaders);
        }

        return Q.all(testPromises)
            .then(prepareWptResultList)
            .then(waitComplete);
    },

    /**
     *
     * @param {String} testId
     * @returns {Promise<Object>} Status, see: https://clck.ru/9fXDC
     */
    getTestStatus: function (testId) {
        return Q.ninvoke(this.wpt, 'getTestStatus', testId)
            .then(prepareWptResult);
    },

    /**
     * Create compare video
     * @param {Object[]} testsDataList
     * @returns {Promise<Object>} Video data
     */
    createVideo: function (testsDataList) {
        var testIds = testsDataList.map(function (testData) {
            return testData.data.testId;
        });

        return Q.ninvoke(this.wpt, 'createVideo', testIds.join(','), {})
            .then(prepareWptResult);
    },

    getVideoPlayerUrl: function (videoData) {
        var statusUrl = videoData.data.jsonUrl;

        // TODO: implement waiting
        return ask({url: statusUrl});
    }
});

function prepareWptResult(videoData) {
    return _.get(videoData, 0);
}

function prepareWptResultList(results) {
    return _.compact(_.flatten(results));
}
