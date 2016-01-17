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
var logger = require('./log');

/**
 * Run WebPageTest diff
 *
 * @param {WPTDiff.Params} params
 *
 * @returns {Promise<Object>}
 */
module.exports = function runWptDiff(params) {
    logger.info('[differ] Start diff with params:', params);

    var differ = new WPTDiff(params);
    return differ.run(params.urls)
        .then(function (data) {
            logger.info('[differ] Diff complete');
            return data;
        });
};

module.exports.WPTDiff = WPTDiff;

/**
 * Compare object constructor
 *
 * @param {WPTDiff.Params} params
 *
 * @constructor
 */
function WPTDiff(params) {
    params = _.defaults(params || {}, {
        host: 'www.webpagetest.org',
        private: true,
        label: 'WTPDiff test'
    });

    this._apiKey = params.apiKey;
    this._host = params.host;
    this._wpt = new WebPageTest(this._host, this._apiKey);

    this._testOptions = _.pick(params, this.TEST_OPTIONS);
    this._testOptions.video = true;

    logger.debug('[differ] WPT options:', this._testOptions);
}

_.assign(WPTDiff.prototype, /** @lends WPTDiff.prototype */ {
    TEST_OPTIONS: [
        'location',
        'connectivity',
        'bodies',
        'timeline',
        'tcpdump'
    ],

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
        return Q.all([
            this._requestTestResults(testsData),
            this._requestVideo(testsData)
        ]);
    },

    _requestTestResults: function (testsData) {
        var that = this;

        this._results.results = {};

        var resultsPromises = testsData.map(function (testData) {
            return this.getTestDetails(testData.data.testId);
        }, this);

        return Q.all(resultsPromises)
            .then(function (results) {
                results = prepareWptResultList(results);

                results.forEach(function (testData) {
                    that._results.results[testData.data.id] = testData.data;
                });

                return results;
            });
    },

    _requestVideo: function (testsData) {
        return this.createVideo(testsData)
            .then(_.bind(this.getVideoPlayer, this));
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
        logger.info('[differ] Run tests for %s', urls.join(', '));

        return this._launchTests(urls)
            .then(_.bind(this._rememberLaunchData, this))
            .then(_.bind(this._waitTestsComplete, this))
            .then(_.bind(this._rememberTestsData, this));
    },

    _launchTests: function (urls) {
        var testPromises = urls.map(function (url) {
            logger.info('[differ] Launch test for ' + url + ' with params:', this._testOptions);
            return Q.ninvoke(this._wpt, 'runTest', url, this._testOptions);
        }, this);

        function checkStatus(data) {
            logger.debug('[differ] Launch tests data: %j', data);
            data.forEach(function (testData) {
                if (testData.statusCode >= 300) {
                    throw new Error('Launch error. Status: ' + testData.statusCode + ': ' + testData.statusText);
                }
            });
            return data;
        }

        function logResults(data) {
            logger.info('[differ] Tests have launched');

            data.forEach(function (testData) {
                var data = testData.data;
                logger.info('[differ] Report for %s: %s ', data.testId, data.userUrl);
            });

            return data;
        }

        return Q.all(testPromises)
            .then(prepareWptResultList)
            .then(checkStatus)
            .then(logResults);
    },

    _rememberLaunchData: function (data) {
        this._results.launch = {};

        data.forEach(function (testData) {
            var data = testData.data;
            this._results.launch[data.testId] = data;
        }, this);

        return data;
    },

    _waitTestsComplete: function (testsDataList) {
        logger.info('[differ] Waiting for tests complete');

        var allReaders = testsDataList.map(function (testData) {
            var reader = _.bind(function () {
                return this.getTestStatus.apply(this, arguments);
            }, this, testData.data.testId);

            reader.id = 'GET ' + testData.data.testId;

            return reader;
        }, this);

        return httpResources.readResourceWhenReady(allReaders)
            .then(function (data) {
                logger.info('[differ] All tests complete');
                return data;
            });
    },

    _rememberTestsData: function (results) {
        var ids = this._results.ids = {};
        var testsInfo = this._results.tests = {};

        results.forEach(function (testData) {
            var data = testData.data;
            var id = data.id;
            var url = data.testInfo.url;

            ids[url] = id;

            testsInfo[id] = data;
        }, this);

        return results;
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
        logger.info('[differ] Request results for %s', testId);
        return Q.ninvoke(this._wpt, 'getTestResults', testId)
            .then(function (data) {
                logger.info('[differ] Results for %s have received', testId);
                return data;
            });
    },

    /**
     * Create compare video
     *
     * @param {Object[]} testsDataList
     *
     * @returns {Promise<Object>} Video data
     */
    createVideo: function (testsDataList) {
        var that = this;

        var testIds = testsDataList.map(function (testData) {
            return testData.data.testId;
        });

        var idsStr = testIds.join(', ');
        logger.info('[differ] Create video for %s', idsStr);

        function checkStatus(videoData) {
            logger.debug('[differ] Create video data:', videoData);
            if (videoData.statusCode >= 300) {
                throw new Error('Video error. Status: ' + videoData.statusCode + ': ' + videoData.statusText);
            }
            return videoData;
        }

        function processData(videoData) {
            var data = videoData.data;

            logger.info('[differ] Video for %s complete, its id: %s', idsStr, data.videoId);

            that._results.video = data;
            return videoData;
        }

        return Q.ninvoke(this._wpt, 'createVideo', idsStr, {})
            .then(prepareWptResult)
            .then(checkStatus)
            .then(processData);
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

        logger.info('[differ] Create video player for video %s', videoData.data.videoId);

        function readData() {
            return ask({url: statusUrl})
                .then(function (results) {
                    return JSON.parse(results.data);
                });
        }

        readData.id = 'CREATE_PLAYER';

        var that = this;
        return httpResources.readResourceWhenReady(readData)
            .then(function (playerData) {
                playerData = prepareWptResult(playerData);
                that._results.player = playerData.data;

                logger.info('[differ] Player created, ids URL: %s', playerData.data.embedUrl);
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
