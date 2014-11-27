var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    util = require('util'),
    _ = require('lodash');

var app = express(),
    vars = {
        bucket: process.env.INNO_BUCKET || 'retert',
        appKey: process.env.INNO_APP_KEY || '',
        appName: 'sdfsdf1',
        groupId: 4,
        auth: {
            user: '4.superuser',
            pass: 'test'
        }
    },
    port = parseInt(process.env.PORT, 10);

app.use(express['static'](__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var getAlchemyApp = function (obj) {
        return util.format('http://access.alchemyapi.com/calls/url/URLGetRankedNamedEntities?apikey=%s&url=%s&outputMode=json', obj.apikey, obj.url);
    },
    getProfilesApp = function (obj) {
        return util.format('https://prerelease.innomdc.com/v1/companies/%s/buckets/%s/profiles/%s?app_key=%s', obj.groupId, obj.bucketName, obj.profileId, obj.appKey);
    },
    getSettingsApp = function (obj) {
        return util.format('https://prerelease.innomdc.com/v1/companies/%s/buckets/%s/apps/%s/custom?app_key=%s', obj.groupId, obj.bucketName, obj.apps, obj.appKey);
    };

var setData = function (req, res) {
    try {
        var currentInterests;
        request.get(getSettingsApp({
            groupId: vars.groupId,
            bucketName: vars.bucket,
            apps: vars.appName,
            appKey: vars.appKey
        }), {
            auth: vars.auth
        }, function (error, response) {
            if (error && !response.body) {
                throw error || new Error('Empty response');
            }
            var apiKey = JSON.parse(response.body).custom.apiKey;
            var profile = req.body.profile;

            // parsing the profile to get URL and Profile ID
            var session = profile.sessions[0],
                url = session.events[0].data['page-url'],
                profileId = profile.id;
            console.log('URL visited: ' + url);
            console.log('Profile ID: ' + profileId);

            // making the entity extraction call
            request.get(getAlchemyApp({
                apikey: apiKey,
                url: url
            }), function (error, response) {
                if (error && !response.body) {
                    throw error || new Error('Empty response');
                }
                response = JSON.parse(response.body);
                var interests = [];
                for (var i = 0; i < response.entities.length; i++) {
                    var entitie = response.entities[i];
                    if (entitie.type === 'FieldTerminology') {
                        interests.push(entitie.text);
                    }
                    if (interests.length >= 3) {
                        break;
                    }
                }
                console.log('interests: ' + interests);
                // getting the profile to check current interests
                request.get(getProfilesApp({
                    groupId: /*vars.groupId*/ 222,
                    bucketName: /*vars.bucket*/ 'first-bucket',
                    profileId: /*profileId*/ 'xjf8k76t1d7n807lhp8yjwqjbmw0j9sq',
                    appKey: /*vars.appKey*/ 'XVNo1A1sFP9ly7U0'
                }), function (error, response) {
                    if (error && !response.body) {
                        throw error || new Error('Empty response');
                    }
                    var receivedProfile = JSON.parse(response.body).profile;
                    if (receivedProfile.attributes && receivedProfile.attributes[0] && receivedProfile.attributes[0].data.interests) {
                        currentInterests = receivedProfile.attributes[0].data.interests;
                    } else {
                        currentInterests = [];
                    }
                    console.log('current interests: ' + currentInterests);
                    interests = _.uniq(currentInterests.concat(interests));
                    console.log('merged interests: ' + interests);
                    request.post({
                        url: getProfilesApp({
                            groupId: /*vars.groupId*/ 222,
                            bucketName: /*vars.bucket*/ 'first-bucket',
                            profileId: /*profileId*/ 'xjf8k76t1d7n807lhp8yjwqjbmw0j9sq',
                            appKey: /*vars.appKey*/ 'XVNo1A1sFP9ly7U0'
                        }),
                        body: {
                            id: profileId,
                            attributes: [{
                                collectApp: session.collectApp,
                                section: session.section,
                                data: {
                                    interests: interests
                                }
                            }]
                        },
                        json: true
                    }, function (error, response) {
                        if (error && !response.body) {
                            throw error || new Error('Empty response');
                        }
                        console.log(response.body);
                        res.send(null);
                    });
                });
            });
        });
    } catch (e) {
        res.send(e.message);
    }
};

app.post('/', setData);

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});