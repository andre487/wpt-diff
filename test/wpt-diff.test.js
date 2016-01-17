var WPTDiff = require('../lib/wpt-diff').WPTDiff;

describe('WPTDiff', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('params', function () {
        it('should provide API key from params', function () {
            var wptDiff = new WPTDiff({apiKey: 'A'});

            assert.equal(wptDiff.getApiKey(), 'A');
        });

        it('should provide host from params', function () {
            var wptDiff = new WPTDiff({host: 'foo.ru'});

            assert.equal(wptDiff.getHost(), 'foo.ru');
        });
    });

    describe('fool protection', function () {
        it('should throw an exception when double run', function () {
            var wptDiff = new WPTDiff();
            sandbox.stub(wptDiff, '_executePipeline');

            assert.throws(function () {
                wptDiff.run([]);
                wptDiff.run([]);
            }, 'Already run');
        });
    });
});
