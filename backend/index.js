var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    util = require('util'),
    _ = require('lodash');

var app = express(),
    port = parseInt(process.env.PORT, 10);

app.use(express['static'](__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var inno = require('./innometrics-backend-app');
inno.setVars({
    bucketName: process.env.INNO_BUCKET || 'testalch',
    appKey: process.env.INNO_APP_KEY || '30r22Cj43U7J0WG2',
    appName: process.env.INNO_APP_NAME || 'alch',
    groupId: process.env.INNO_COMPANY_ID || 310,
    apiUrl: process.env.INNO_API_URL || 'http://prerelease.innomdc.com/v1',
    auth: {
        user: '4.superuser',
        pass: 'test'
    }
});

var getAlchemyApp = function (obj) {
    return util.format('http://access.alchemyapi.com/calls/url/URLGetRankedNamedEntities?apikey=%s&url=%s&outputMode=json', obj.apiKey, obj.url);
};

var errors = [],
    jsonError = function (res, error) {
        errors.push(error);
        return res.json({
            error: error
        });
    };

var setData = function (req, res) {
    try {
        inno.getDatas(req, function (error, data) {
            if (error) {
                return jsonError(error);
            }
            if (!data.hasOwnProperty('page-url')) {
                return jsonError(res, 'Page URL not set');
            }
            inno.setVar('url', data['page-url']);

            inno.getSettings({
                vars: inno.getVars()
            }, function (error, settings) {
                if (error) {
                    return jsonError(error);
                }
                var apiKey = settings.apiKey,
                    entityType = settings.entityType,
                    minRelevance = settings.minRelevance;

                if (!apiKey) {
                    inno.clearCache();
                    return jsonError(res, 'Alchemy api key not set');
                }

                // parsing the profile to get URL and Profile ID
                console.log('URL visited: ' + inno.getVars().url);
                console.log('Profile ID: ' + inno.getVars().profileId);

                // making the entity extraction call
                request.get(getAlchemyApp({
                    apiKey: apiKey,
                    url: inno.getVars().url
                }), function (error, response) {
                    if (error || !response.body) {
                        return jsonError(error || new Error('Empty response'));
                    }
                    try {
                        response = JSON.parse(response.body);
                    } catch (e) {
                        return jsonError(res, 'Parse JSON');
                    }
                    var interests = [];
                    for (var i = 0; i < response.entities.length; i++) {
                        var entitie = response.entities[i];
                        if (entityType.indexOf(entitie.type) && entitie.relevance >= minRelevance) {
                            interests.push(entitie.text);
                        }
                        if (interests.length >= 3) {
                            break;
                        }
                    }
                    console.log('interests: ' + interests);
                    // getting the profile to check current interests
                    inno.getProfile({
                        vars: inno.getVars()
                    }, function (error, attributes) {
                        if (error) {
                            return jsonError(error);
                        }
                        var currentInterests = attributes.interests || [];
                        console.log('current interests: ' + currentInterests);
                        interests = _.uniq(currentInterests.concat(interests));
                        console.log('merged interests: ' + interests);
                        inno.updateProfile({
                            vars: inno.getVars(),
                            data: {
                                interests: interests
                            }
                        }, function (error) {
                            if (error) {
                                return jsonError(error);
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
    res.send('Uptime: ' + (process.uptime() / 60) + ' minutes\n\n' +
        'EVN VARS: ' + JSON.stringify(process.env) + '\n\n' +
        'Last errors: ' + errors.join('\n'));
});

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});