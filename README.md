# WebPageTest Diff
Uses several URLs to run tests with [WebPageTest.org](http://www.webpagetest.org/), and prints results to stdout.

[![Code Climate](https://codeclimate.com/github/andre487/wpt-diff/badges/gpa.svg)](https://codeclimate.com/github/andre487/wpt-diff)
[![bitHound Code](https://www.bithound.io/github/andre487/wpt-diff/badges/code.svg)](https://www.bithound.io/github/andre487/wpt-diff)
[![bitHound Overall Score](https://www.bithound.io/github/andre487/wpt-diff/badges/score.svg)](https://www.bithound.io/github/andre487/wpt-diff)

Results contain the following data (in JSON):
  * URLs of reports on WebPageTest.org
  * Loading metrics for each page
  * Video with loading timeline for all pages

You need an [API key](http://www.webpagetest.org/getkey.php) for using public instance

## Usage
```
usage: wpt-diff [-h] [-v] [--api-key APIKEY] [--host HOST]
                [--location LOCATION] [--connectivity CONNECTIVITY] [--mobile]
                [--timeline] [--bodies] [--label LABELS] [--url URLS]
                

Tool for compare services with WebPageTest

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  --api-key APIKEY      WebPageTest API key. Env: WPT_API_KEY
  --host HOST           WebPageTest host, default: www.webpagetest.org. Env: 
                        WPT_HOST
  --location LOCATION   Test server location, see https://clck.ru/9fn76. Env: 
                        WPT_LOCATION
  --connectivity CONNECTIVITY
                        Connection type for tests. Env: WPT_CONNECTIVITY
  --mobile              Test with mobile device emulation. Env: WPT_MOBILE
  --timeline            Save timeline. Env: WPT_TIMELINE
  --bodies              Save text resources bodies. Env: WPT_BODIES
  --label LABELS        Labels for tests. Can be passed N times. Env: 
                        WPT_LABELS
  --url URLS            URLs for tests. Can be passed N times. Env: WPT_URLS

Program documentation: https://github.com/andre487/wpt-diff#readme
```

For understanding location param see public instance agents list: 
[locations](http://www.webpagetest.org/getLocations.php?f=html&k=A)

## Example
```
 $ export WPT_LOG_LEVEL=debug 
 $ export WPT_API_KEY=<your key> 
 $ wpt-diff --url https://yandex.ru --url https://google.ru --url https://bing.com --label Yandex --label Google --label Bing
```

Results:
  * [results.json](examples/results.json)
  * [Video](http://www.webpagetest.org/video/view.php?embed=1&id=160118_ac785dba5f75107644e25dd03ddcf52e61d12b86)

## Results format
```
{
    "ids": {
      url1: id1,
      ...,
      urlN: idN
    },
    "launch": {
        id1: {
          "testId": "160117_VC_SQJ",
          "ownerKey": ownerKey,
          "jsonUrl": "http://www.webpagetest.org/jsonResult.php?test=id1",
          "xmlUrl": "http://www.webpagetest.org/xmlResult/id1/",
          "userUrl": "http://www.webpagetest.org/result/id1/",
          "summaryCSV": "http://www.webpagetest.org/result/id1/page_data.csv",
          "detailCSV": "http://www.webpagetest.org/result/id1/requests.csv"
        },
        ...,
        idN: ...
    },
    "testCases": {
        id1: technical test case data,
        ...,
        idN: ...
    },
    "results": {
        id1: very detailed test results data, 
        ...,
        idN: ...
    },
    "video": {
      "videoId": videoId,
      "jsonUrl": "http://www.webpagetest.org/video/view.php?f=json&id=videoId",
      "userUrl": "http://www.webpagetest.org/video/view.php?id=videoId"
    },
    "player": {
      "videoId": videoId,
      "videoUrl": "http://www.webpagetest.org/video/download.php?id=videoId",
      "embedUrl": "http://www.webpagetest.org/video/view.php?embed=1&id=videoId",
      "width": 520,
      "height": 432
    }
}
```
