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
    bucketName: process.env.INNO_BUCKET || 'steel',
    appKey: process.env.INNO_APP_KEY || 'K69XeW05b4sRGJXG',
    appName: process.env.INNO_APP_NAME || 'aluminium',
    groupId: process.env.INNO_COMPANY_ID || 8,
    apiUrl: process.env.INNO_API_URL || 'http://prerelease.innomdc.com/v1',
    auth: {
        user: '4.superuser',
        pass: 'test'
    }
});

var getAlchemyApp = function (obj) {
    return util.format('http://access.alchemyapi.com/calls/url/URLGetRankedNamedEntities?apikey=%s&url=%s&outputMode=json', obj.apiKey, obj.url);
};

var setData = function (req, res) {
    try {
        inno.getDatas(req, function (error, data) {
            if (error) {
                throw error;
            }
            if (!data.hasOwnProperty('page-url')) {
                throw new Error('Page URL not set');
            }
            inno.setVar('url', data['page-url']);

            inno.getSettings({
                vars: inno.getVars()
            }, function (error, settings) {
                if (error) {
                    throw error;
                }
                var apiKey = settings.apiKey,
                    types = settings.types || ['FieldTerminology'];

                if (!apiKey) {
                    throw new Error('Alchemy api key not set');
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
                        throw error || new Error('Empty response');
                    }
                    try {
                        response = JSON.parse(response.body);
                    } catch (e) {
                        throw new Error('Parse JSON');
                    }
                    var interests = [];
                    for (var i = 0; i < response.entities.length; i++) {
                        var entitie = response.entities[i];
                        if (types.indexOf(entitie.type)) {
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
                            throw error;
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
                                throw error;
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
    res.send(JSON.stringify(process.env));
});

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});