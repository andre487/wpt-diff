var parameters = require('../lib/parameters');

describe('parameters', function () {
    describe('#getFromEnv', function () {
        var ENV = {
            WPT_API_KEY: 'A.foo',
            WPT_LOCATION: 'Moscow_IE9:Chrome',
            WPT_CONNECTIVITY: 'Cable',

            WPT_MOBILE: '1',
            WPT_BODIES: '1',
            WPT_TIMELINE: '1',

            WPT_LABELS: 'Yandex Google',
            WPT_URLS: 'https://yandex.ru  https://google.ru'
        };

        var params;

        before(function () {
            params = parameters.getFromEnv(ENV);
        });

        it('should provide apiKey', function () {
            assert.propertyVal(params, 'apiKey', 'A.foo');
        });

        it('should provide location', function () {
            assert.propertyVal(params, 'location', 'Moscow_IE9:Chrome');
        });

        it('should provide connectivity', function () {
            assert.propertyVal(params, 'connectivity', 'Cable');
        });

        it('should provide mobile param', function () {
            assert.propertyVal(params, 'mobile', true);
        });

        it('should provide bodies param', function () {
            assert.propertyVal(params, 'bodies', true);
        });

        it('should provide timeline param', function () {
            assert.propertyVal(params, 'timeline', true);
        });

        it('should provide labels', function () {
            assert.property(params, 'labels');

            assert.lengthOf(params.labels, 2);
            assert.includeMembers(params.labels, ['Google', 'Yandex']);
        });

        it('should provide urls', function () {
            assert.property(params, 'urls');

            assert.lengthOf(params.urls, 2);
            assert.includeMembers(params.urls, ['https://yandex.ru', 'https://google.ru']);
        });
    });

    describe('#getFromCli', function () {
        it('should provide apiKey', function () {
            var params = parameters.getFromCli(['--api-key', 'A.foo']);

            assert.propertyVal(params, 'apiKey', 'A.foo');
        });

        it('should provide location', function () {
            var params = parameters.getFromCli(['--location', 'Moscow_IE9:Chrome']);

            assert.propertyVal(params, 'location', 'Moscow_IE9:Chrome');
        });

        it('should provide connectivity', function () {
            var params = parameters.getFromCli(['--connectivity', 'Cable']);

            assert.propertyVal(params, 'connectivity', 'Cable');
        });

        it('should provide mobile param', function () {
            var params = parameters.getFromCli(['--mobile']);

            assert.propertyVal(params, 'mobile', true);
        });

        it('should provide mobile param absent', function () {
            var params = parameters.getFromCli([]);

            assert.propertyVal(params, 'mobile', false);
        });

        it('should provide bodies param', function () {
            var params = parameters.getFromCli(['--bodies']);

            assert.propertyVal(params, 'bodies', true);
        });

        it('should provide bodies param absent', function () {
            var params = parameters.getFromCli([]);

            assert.propertyVal(params, 'bodies', false);
        });

        it('should provide timeline param', function () {
            var params = parameters.getFromCli(['--timeline']);

            assert.propertyVal(params, 'timeline', true);
        });

        it('should provide timeline param absent', function () {
            var params = parameters.getFromCli([]);

            assert.propertyVal(params, 'timeline', false);
        });

        it('should provide labels', function () {
            var params = parameters.getFromCli(['--label', 'Yandex', '--label', 'Google']);

            assert.property(params, 'labels');

            assert.lengthOf(params.labels, 2);
            assert.includeMembers(params.labels, ['Google', 'Yandex']);
        });

        it('should provide urls', function () {
            var params = parameters.getFromCli(['--url', 'https://yandex.ru', '--url', 'https://google.ru']);

            assert.property(params, 'urls');

            assert.lengthOf(params.urls, 2);
            assert.includeMembers(params.urls, ['https://yandex.ru', 'https://google.ru']);
        });
    });
});
