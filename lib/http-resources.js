'use strict';
/**
 * @file
 * Module for working with HTTP resources
 */

var _ = require('lodash');
var Q = require('q');

var logger = require('./log');

var DEFAULT_READY_POLLING_INTERVAL = 1000;

var rest = exports;

/**
 * Read HTTP resource data when it ready
 *
 * @param {Function|Function[]} getResourceData Should return Promise<Object>
 * @param {String} getResourceData.id
 * @param {Number} [interval=DEFAULT_READY_POLLING_INTERVAL]
 *
 * @returns {Promise<Object[]>} Resource data
 */
rest.readResourceWhenReady = function readResourceWhenReady(getResourceData, interval) {
    var readers = [].concat(getResourceData);
    readers.forEach(function (reader, i) {
        reader.id = reader.id || 'http-reader-' + i;
    });

    interval = interval || DEFAULT_READY_POLLING_INTERVAL;

    logger.debug('[http-resources] Start resource polling for %s resources', readers.length);

    var poll = _.partial(pollResource, interval);
    var promises = readers.map(poll);

    return Q.all(promises);
};

function pollResource(interval, getResourceData) {
    logger.debug('[http-resources] Start polling for', getResourceData.id);

    var deferred = Q.defer();

    doPoll();

    function doPoll() {
        setTimeout(pollStatus, interval);
    }

    function pollStatus() {
        logger.debug('[http-resources] Poll %s status', getResourceData.id);
        getResourceData()
            .then(function (results) {
                logger.debug('[http-resources] Resource %s status: %s', getResourceData.id, results.statusCode);
                return results;
            })
            .then(checkStatus);
    }

    function checkStatus(resourceData) {
        if (resourceData.statusCode >= 200 && resourceData.statusCode < 300) {
            return deferred.resolve(resourceData);
        }

        if (resourceData.statusCode >= 300) {
            return deferred.reject(new Error(resourceData.statusText));
        }

        doPoll();
    }

    return deferred.promise;
}
