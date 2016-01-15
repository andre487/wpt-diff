/**
 * @file
 * Module for working with HTTP resources
 */
var _ = require('lodash');
var Q = require('q');

var DEFAULT_READY_POLLING_INTERVAL = 1000;

var rest = exports;

/**
 * Read HTTP resource data when it ready
 * @param {Function|Function[]} getResourceData Should return Promise<Object>
 * @param {Number} [interval=DEFAULT_READY_POLLING_INTERVAL]
 * @returns {Promise<Object[]>} Resource data
 */
rest.readResourceWhenReady = function readResourceWhenReady(getResourceData, interval) {
    interval = interval || DEFAULT_READY_POLLING_INTERVAL;

    var poll = _.partial(pollResource, interval);
    var promises = [].concat(getResourceData).map(poll);

    return Q.all(promises);
};

function pollResource(interval, getResourceData) {
    var deferred = Q.defer();

    doPoll();

    function doPoll() {
        setTimeout(pollStatus, interval);
    }

    function pollStatus() {
        getResourceData()
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
