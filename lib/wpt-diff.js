var ask = require('vow-asker');
var Q = require('q');
var WebPageTest = require('webpagetest');
var _ = require('lodash');

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
            .then(_.bind(this.waitComplete, this))
            .then(_.bind(this.createVideo, this))
            .then(_.bind(this.getVideoPlayerUrl, this));
    },

    /**
     * Run pages tests
     * @param {String[]} urls
     * @returns {Promise<Object>} Test results, see https://clck.ru/9fX69
     */
    runTests: function (urls) {
        var promises = urls.map(function (url) {
            return Q.ninvoke(this.wpt, 'runTest', url, this.TEST_OPTIONS);
        }, this);
        return Q.all(promises)
            .then(function (data) {
                return _.compact(_.flatten(data));
            });
    },

    /**
     *
     * @param {String} testId
     * @returns {Promise<Object>} Status, see: https://clck.ru/9fXDC
     */
    getTestStatus: function (testId) {
        return Q.ninvoke(this.wpt, 'getTestStatus', testId)
            .then(function (statusData) {
                return _.get(statusData, 0);
            });
    },

    /**
     * Wait tests complete
     * @param {Object[]} testsDataList Test results
     * @returns {Promise<Object>}
     */
    waitComplete: function (testsDataList) {
        var checker = new CompleteChecker(this, testsDataList);

        checker.run();

        return checker.getPromise()
            .then(_.constant(testsDataList));
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
            .then(function (videoData) {
                return _.get(videoData, 0);
            });
    },

    getVideoPlayerUrl: function (videoData) {
        var statusUrl = videoData.data.jsonUrl;

        // TODO: implement waiting
        return ask({url: statusUrl});
    }
});

function CompleteChecker(wpt, testsDataList) {
    this.wpt = wpt;
    this.deferred = Q.defer();

    this.testsDataList = testsDataList;
}

_.assign(CompleteChecker.prototype, /** @lends CompleteChecker.prototype */ {
    getPromise: function () {
        return this.deferred.promise;
    },

    run: function () {
        var finishedPromise = Q.all(
            this.testsDataList.map(this.runTestChecker, this)
        );
        this.deferred.resolve(finishedPromise);
    },

    runTestChecker: function (testData) {
        var that = this;
        var deferred = Q.defer();

        makePoll();

        function makePoll() {
            setTimeout(pollStatus, that.wpt.COMPLETE_POLLING_INTERVAL);
        }

        function pollStatus() {
            that.wpt.getTestStatus(testData.data.testId)
                .then(checkStatus);
        }

        function checkStatus(statusData) {
            if (statusData.statusCode >= 200 && statusData.statusCode < 300) {
                return deferred.resolve(statusData);
            }

            if (statusData.statusCode >= 300) {
                return deferred.reject(new Error(statusData.statusText));
            }

            makePoll();
        }

        return deferred.promise;
    }
});
