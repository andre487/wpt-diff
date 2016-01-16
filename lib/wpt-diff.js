'use strict';
/**
 * @file
 * WabPageTest diff API
 */
var ask = require('vow-asker');
var Q = require('q');
var WebPageTest = require('webpagetest');
var _ = require('lodash');

var httpResources = require('./http-resources');

/**
 * Run WebPageTest diff
 *
 * @param {String[]} urls
 * @param {String} [host]
 * @param {String} [apiKey]
 *
 * @returns {Promise<Object>}
 */
module.exports = function runWptDiff(urls, host, apiKey) {
    var differ = new WPTDiff(host, apiKey);
    return differ.run(urls);
};

/**
 * Compare object constructor
 *
 * @param {String} [host] service host
 * @param {String} [apiKey]
 *
 * @constructor
 */
function WPTDiff(host, apiKey) {
    if (!apiKey) {
        apiKey = host;
        host = null;
    }
    host = host || this.DEFAULT_SERVICE_HOST;

    this._host = host;
    this._wpt = new WebPageTest(host, apiKey);
}

_.assign(WPTDiff.prototype, /** @lends WPTDiff.prototype */ {
    DEFAULT_SERVICE_HOST: 'www.webpagetest.org',

    COMPLETE_POLLING_INTERVAL: 1000,

    // TODO: add params: label, location, connectivity, mobile
    TEST_OPTIONS: {
        bodies: true,
        timeline: true,
        video: true
    },

    /**
     * Run compare
     *
     * @param {String[]} urls
     *
     * @returns {Promise<Object>}
     */
    run: function (urls) {
        if (this._lock) {
            throw new Error('Already run');
        }
        this._lock = true;

        // Results that be returned to user
        this._results = {};

        var that = this;

        function requestDetails(testsData) {
            that._results.results = {};

            var resultsPromises = testsData.map(function (testData) {
                return that.getTestDetails(testData.data.testId);
            });

            var allResultsPromise = Q.all(resultsPromises).then(function (results) {
                results = prepareWptResultList(results);

                results.forEach(function (testData) {
                    that._results.results[testData.data.id] = testData.data;
                });

                return results;
            });

            var videoPromise = that.createVideo(testsData)
                .then(_.bind(that.getVideoPlayer, that));

            return Q.all([allResultsPromise, videoPromise]);
        }

        function finalizeRun() {
            that._lock = false;
            return that._results;
        }

        return this.runTests(urls)
            .then(requestDetails)
            .then(finalizeRun);
    },

    /**
     * Run pages tests
     *
     * @param {String[]} urls
     *
     * @returns {Promise<Object>} Test results, see https://clck.ru/9fX69
     */
    runTests: function (urls) {
        var ids = this._results.ids = {};
        var testsInfo = this._results.tests = {};
        var that = this;

        var testPromises = urls.map(function (url) {
            return Q.ninvoke(that._wpt, 'runTest', url, that.TEST_OPTIONS);
        });

        function waitComplete(testsDataList) {
            var allReaders = testsDataList.map(function (testData) {
                return _.bind(that.getTestStatus, that, testData.data.testId);
            });

            return httpResources.readResourceWhenReady(allReaders);
        }

        function rememberData(results) {
            results.forEach(function (testData) {
                var data = testData.data;
                var id = data.id;
                ids[data.testInfo.url] = id;

                data.webReportUrl = 'http://' + that._host + '/result/' + id + '/';
                testsInfo[id] = data;
            });
            return results;
        }

        return Q.all(testPromises)
            .then(prepareWptResultList)
            .then(waitComplete)
            .then(rememberData);
    },

    /**
     * Get test status by id
     * @param {String} testId
     *
     * @returns {Promise<Object>} Status, see: https://clck.ru/9fXDC
     */
    getTestStatus: function (testId) {
        return Q.ninvoke(this._wpt, 'getTestStatus', testId)
            .then(prepareWptResult);
    },

    /**
     * Get test details
     *
     * @param {String} testId
     *
     * @returns {Promise<Object>}
     */
    getTestDetails: function (testId) {
        return Q.ninvoke(this._wpt, 'getTestResults', testId);
    },

    /**
     * Create compare video
     *
     * @param {Object[]} testsDataList
     *
     * @returns {Promise<Object>} Video data
     */
    createVideo: function (testsDataList) {
        var testIds = testsDataList.map(function (testData) {
            return testData.data.testId;
        });

        var that = this;
        return Q.ninvoke(this._wpt, 'createVideo', testIds.join(','), {})
            .then(function (videoData) {
                videoData = prepareWptResult(videoData);
                that._results.video = videoData.data;
                return videoData;
            });
    },

    /**
     * Get video player data
     *
     * @param {Object} videoData
     *
     * @returns {Promise.<Object>} Player data
     */
    getVideoPlayer: function (videoData) {
        var statusUrl = videoData.data.jsonUrl;

        function readData() {
            return ask({url: statusUrl})
                .then(function (results) {
                    return JSON.parse(results.data);
                });
        }

        var that = this;
        return httpResources.readResourceWhenReady(readData)
            .then(function (playerData) {
                playerData = prepareWptResult(playerData);
                that._results.player = playerData.data;
                return playerData;
            });
    }
});

function prepareWptResult(videoData) {
    return _.get(videoData, 0);
}

function prepareWptResultList(results) {
    return _.compact(_.flatten(results));
}
