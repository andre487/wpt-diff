var parameters = require('../lib/parameters');

describe('parameters', function () {
    describe('#getFromEnv', function () {
        var ENV = {
            WPT_API_KEY: 'A.foo',
            WPT_LOCATION: 'Moscow_IE9:Chrome',
            WPT_CONNECTIVITY: 'Cable',
            WPT_MOBILE: '1',

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
});
