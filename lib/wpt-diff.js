'use strict';
/**
 * @file
 * WabPageTest diff API
 */

var _ = require('lodash');
var ask = require('vow-asker');
var Q = require('q');
var WebPageTest = require('webpagetest');

var httpResources = require('./http-resources');

/**
 * Run WebPageTest diff
 *
 * @param {WPTDiff.Params} params
 *
 * @returns {Promise<Object>}
 */
module.exports = function runWptDiff(params) {
    var differ = new WPTDiff(params.apiKey, params.host);
    return differ.run(params.urls);
};

module.exports.WPTDiff = WPTDiff;

/**
 * Compare object constructor
 *
 * @param {String} [apiKey]
 * @param {String} [host] service host
 *
 * @constructor
 */
function WPTDiff(apiKey, host) {
    host = host || this.DEFAULT_SERVICE_HOST;

    this._apiKey = apiKey;
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
     * Get current WebPageTest host
     * @returns {String}
     */
    getHost: function () {
        return this._host;
    },

    /**
     * Get current WebPageTest API key
     * @returns {String}
     */
    getApiKey: function () {
        return this._apiKey;
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

        return this._executePipeline(urls);
    },

    _executePipeline: function (urls) {
        return this.runTests(urls)
            .then(_.bind(this._requestTestsDetails, this))
            .then(_.bind(this._finalizePipeline, this));
    },

    _requestTestsDetails: function (testsData) {
        var that = this;

        this._results.results = {};

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

        var videoPromise = this.createVideo(testsData)
            .then(_.bind(this.getVideoPlayer, this));

        return Q.all([allResultsPromise, videoPromise]);
    },

    _finalizePipeline: function () {
        this._lock = false;
        return this._results;
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
