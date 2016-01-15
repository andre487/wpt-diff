/**
 * @file
 * Report module
 */

/**
 * Prepare human readable JSON for report
 *
 * @param {Object} data
 *
 * @returns {String}
 */
module.exports = function prepareReport(data) {
    return JSON.stringify(data, null, 2);
};
