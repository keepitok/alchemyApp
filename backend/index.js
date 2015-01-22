var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    util = require('util');

var app = express(),
    port = parseInt(process.env.PORT, 10);

app.use(express['static'](__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var inno = require('./innometrics-backend-app');
inno.setVars({
    bucketName: process.env.INNO_BUCKET_ID || 'testalch',
    appKey: process.env.INNO_APP_KEY || '30r22Cj43U7J0WG2',
    appName: process.env.INNO_APP_ID || 'alch',
    groupId: process.env.INNO_COMPANY_ID || 310,
    apiUrl: process.env.INNO_API_HOST || 'http://prerelease.innomdc.com'
});

var getAlchemyApp = function (obj) {
    return util.format('http://access.alchemyapi.com/calls/url/URLGetRankedNamedEntities?apikey=%s&url=%s&outputMode=json', obj.apiKey, obj.url);
};

var errors = [],
    tasks = [],
    jsonError = function (res, error) {
        errors.push(error);
        return res.json({
            error: null
        });
    };

var setData = function (req, res) {
    var indexTask = tasks.push('---');
    try {
        inno.getDatas(req, function (error, data) {
            if (error) {
                return jsonError(res, error);
            }
            if (!data.hasOwnProperty('page-url')) {
                return jsonError(res, 'Page URL not set');
            }
            tasks[indexTask - 1] = data['page-url'];
            inno.setVar('url', data['page-url']);

            inno.getSettings({
                vars: inno.getVars()
            }, function (error, settings) {
                if (error) {
                    return jsonError(res, error);
                }
                var apiKey = settings.apiKey,
                    entityType = settings.entityType,
                    minRelevance = settings.minRelevance,
                    amountInterests = settings.amountInterests;

                if (!apiKey) {
                    inno.clearCache();
                    return jsonError(res, 'Alchemy api key not set');
                }

                // parsing the profile to get URL and Profile ID
                console.log('URL visited: ' + inno.getVars().url);
                console.log('Profile ID: ' + inno.getVars().profileId);

                // making the entity extraction call
                var url = getAlchemyApp({
                    apiKey: apiKey,
                    url: inno.getVars().url
                });
                request.get(url, function (error, response) {
                    if (error) {
                        return jsonError(res, error);
                    }
                    try {
                        response = JSON.parse(response.body);
                    } catch (e) {
                        return jsonError(res, 'Parse JSON (' + url + ')');
                    }

                    // getting the profile to check current interests
                    inno.getProfile({
                        vars: inno.getVars()
                    }, function (error, attributes) {
                        if (error) {
                            return jsonError(res, error);
                        }

                        var interests = attributes.interests || {};
                        console.log('interests: ' + JSON.stringify(interests));

                        for (var i = 0; i < response.entities.length; i++) {
                            var entitie = response.entities[i];
                            var relevance = parseFloat(entitie.relevance);
                            if (entityType.indexOf(entitie.type) && relevance >= minRelevance) {
                                interests[entitie.text] = interests.hasOwnProperty(entitie.text) ? (interests[entitie.text] + relevance) / 2 : relevance;
                            }
                        }
                        console.log('current interests: ' + JSON.stringify(interests));

                        var sortableInterests = {};
                        Object.keys(interests)
                            .map(function (k) {
                                return [k, interests[k]];
                            })
                            .sort(function (a, b) {
                                if (a[1] < b[1]) {
                                    return -1;
                                }
                                if (a[1] > b[1]) {
                                    return 1;
                                }
                                return 0;
                            }).reverse().splice(0, amountInterests)
                            .forEach(function (d) {
                                sortableInterests[d[0]] = d[1];
                            });
                        console.log('merged interests: ' + JSON.stringify(sortableInterests));

                        inno.updateProfile({
                            vars: inno.getVars(),
                            data: {
                                interests: sortableInterests
                            }
                        }, function (error) {
                            if (error) {
                                return jsonError(res, error);
                            }
                            res.json({
                                error: null
                            });
                        });
                    });
                });
            });
        });
    } catch (e) {
        res.json({
            error: e.message
        });
    }
};

app.post('/', setData);
app.get('/', function (req, res) {
    var endIndex;
    if (tasks.length > 10) {
        endIndex = tasks.length - 1;
        tasks = tasks.slice(endIndex - 10, endIndex);
    }
    if (errors.length > 10) {
        endIndex = errors.length - 1;
        errors = errors.slice(endIndex - 10, endIndex);
    }

    res.send('Uptime: ' + (process.uptime() / 60) + ' minutes<br/><br/>' +
        'EVN VARS: ' + JSON.stringify(process.env) +
        '<br/>Last 10 errors:<br/> ' + errors.join('<br/>') +
        '<br/>Last 10 tasks:<br/> ' + tasks.join('<br/>'));
});

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});