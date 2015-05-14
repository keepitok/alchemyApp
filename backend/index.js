// Base modules
var util = require('util');

// Lib to make http(s) requests
var request = require('request');

// Innometrics Helper
var InnoHelper = require('innometrics-helper'),
    inno = new InnoHelper({
        bucketName: process.env.INNO_BUCKET_ID,
        appKey:     process.env.INNO_APP_KEY,
        apiUrl:     process.env.INNO_API_HOST,
        appName:    process.env.INNO_APP_ID,
        groupId:    process.env.INNO_COMPANY_ID
    });


// Express and middleware
var express = require('express'),
    bodyParser = require('body-parser');

// Express server
var app = express(),
    port = parseInt(process.env.PORT, 10);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var errors = [],
    tasks = [],
    jsonError = function (res, error) {
        errors.push(error);
        return res.json({
            error: null
        });
    };

/**
 * Handle incoming POST request (ProfileStream from DH)
 */
app.post('/', function (req, res) {
    var indexTask = tasks.push('---'); // reserve index

    inno.getProfile(req.body, function (error, parsedData) {
        var pageUrl, profileId, collectApp, section;

        // Check if profile data was parsed
        if (error) {
            return jsonError(res, error);
        }

        // Extract pageUrl from event data
        pageUrl = parsedData.data && parsedData.data['page-url'];
        if (!pageUrl) {
            return jsonError(res, 'Page URL not set');
        }

        tasks[indexTask - 1] = pageUrl;

        profileId   = parsedData.profile.id;
        collectApp  = parsedData.session.collectApp;
        section     = parsedData.session.section;

        // Get application settings
        inno.getAppSettings(function (error, appSettings) {
            var apiKey;

            if (error) {
                return jsonError(res, error);
            }

            apiKey = appSettings.apiKey;

            // apiKey is required
            if (!apiKey) {
                //inno.clearCache(); // TODO
                return jsonError(res, 'Alchemy api key not set');
            }

            // parsing the profile to get URL and Profile ID
            console.log('URL visited: %s', pageUrl);
            console.log('Profile ID: %s', profileId);

            // making the entity extraction call
            var alchemyUrl = getAlchemyAppUrl({
                apiKey: apiKey,
                url:    pageUrl
            });



            request.get(alchemyUrl, function (error, response) {
                var alchemyResponse;

                if (error) {
                    return jsonError(res, error);
                }

                try {
                    alchemyResponse = JSON.parse(response.body);
                } catch (error) {
                    return jsonError(res, 'Could not parse JSON from ' + alchemyUrl);
                }

                inno.getProfileAttributes({
                    profileId:  profileId,
                    collectApp: inno.config.collectApp,
                    section:    section
                }, function (error, attributes) {
                    var entities, interests, sortableInterests,
                        entityType, minRelevance, amountInterests;

                    if (error) {
                        return jsonError(res, error);
                    }

                    attributes = attributes[0] || null;
                    interests = attributes && attributes.data || {};
                    console.log('interests: ' + JSON.stringify(interests));

                    amountInterests = appSettings.amountInterests;
                    entityType = appSettings.entityType;
                    minRelevance = appSettings.minRelevance;
                    entities = (alchemyResponse.entities instanceof Array) ? alchemyResponse.entities : [];

                    interests = getInterests(entities, interests, entityType, minRelevance);
                    console.log('current interests: ' + JSON.stringify(interests));

                    sortableInterests = sortInterests(interests, amountInterests);
                    console.log('merged interests: ' + JSON.stringify(sortableInterests));

                    inno.setProfileAttributes({
                        profileId: profileId,
                        section: section,
                        attributes: sortableInterests
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
});

app.get('/', function (req, res) {
    var resp;

    if (tasks.length > 10) {
        tasks = tasks.slice(-10);
    }
    if (errors.length > 10) {
        errors = errors.slice(-10);
    }

    resp = util.format(
        'Uptime: %s minutes<br><br>' +
        'Last 10 errors:<br>%s<br>' +
        'Last 10 tasks:<br>%s',
        process.uptime() / 60,
        errors.join('<br>'),
        tasks.join('<br>')
    );
    res.send(resp);
});

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});

//
// Util functions
//

function getAlchemyAppUrl (obj) {
    var alchemyAppUrlTemplate = 'http://access.alchemyapi.com/calls/url/URLGetRankedNamedEntities?apikey=%s&url=%s&outputMode=json';
    return util.format(alchemyAppUrlTemplate, obj.apiKey, obj.url);
}

function getInterests (entities, initialInterests, entityType, minRelevance) {
    var interests = util._extend({}, initialInterests);

    entities.forEach(function (entitie) {
        var text = entitie.text,
            type = entitie.type,
            relevance = parseFloat(entitie.relevance);

        if (entityType.indexOf(type) > -1 && relevance >= minRelevance) {
            interests[text] = interests.hasOwnProperty(text) ? (interests[text] + relevance) / 2 : relevance;
        }
    });

    return interests;
}

function sortInterests (interests, max) {
    var sortableInterests = {};
    Object.keys(interests)
        .map(function (interestText) {
            return [interestText, interests[interestText]];
        })
        .sort(function (a, b) {
            if (a[1] < b[1]) {
                return -1;
            }
            if (a[1] > b[1]) {
                return 1;
            }
            return 0;
        }).reverse().splice(0, max)
        .forEach(function (d) {
            sortableInterests[d[0]] = d[1];
        });
    return sortableInterests;
}