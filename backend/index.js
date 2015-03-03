var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    util = require('util'),
    inno = require('innometrics-helper');

var app = express(),
    port = parseInt(process.env.PORT, 10);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

inno.setVars({
    bucketName: process.env.INNO_BUCKET_ID,
    appKey: process.env.INNO_APP_KEY,
    appName: process.env.INNO_APP_ID,
    groupId: process.env.INNO_COMPANY_ID,
    apiUrl: process.env.INNO_API_HOST
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
            if (!(data.data && data.data.hasOwnProperty('page-url'))) {
                return jsonError(res, 'Page URL not set');
            }
            tasks[indexTask - 1] = data.data['page-url'];
            inno.setVar('url', data.data['page-url']);

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
                    } catch (error) {
                        return jsonError(res, 'Parse JSON (' + url + ')');
                    }

                    // getting the profile to check current interests
                    inno.getAttributes({
                        vars: inno.getVars()
                    }, function (error, attributes) {
                        if (error) {
                            return jsonError(res, error);
                        }
                        attributes = attributes.filter(function (attribute) {
                            return attribute.collectApp === inno.getVars().collectApp && attribute.section === inno.getVars().section;
                        });
                        var interests = attributes.length && attributes[0].interests ? attributes[0].interests : {};
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

                        inno.setAttributes({
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
    } catch (error) {
        res.json({
            error: error.message
        });
    }
};

app.post('/', setData);
app.get('/', function (req, res) {
    if (tasks.length > 10) {
        tasks = tasks.slice(-10);
    }
    if (errors.length > 10) {
        errors = errors.slice(-10);
    }

    res.send('Uptime: ' + (process.uptime() / 60) + ' minutes<br/>' +
        '<br/>Last 10 errors:<br/> ' + errors.join('<br/>') +
        '<br/>Last 10 tasks:<br/> ' + tasks.join('<br/>'));
});

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});