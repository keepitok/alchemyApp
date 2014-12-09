var util = require('util'),
    request = require('request');

var cacheable = true,
    vars = {};

var settingsAppUrl = function (obj) {
        return util.format(vars.apiUrl + '/companies/%s/buckets/%s/apps/%s/custom?app_key=%s', obj.groupId, obj.bucketName, obj.appName, obj.appKey);
    },
    profilesAppUrl = function (obj) {
        return util.format(vars.apiUrl + '/companies/%s/buckets/%s/profiles/%s?app_key=%s', obj.groupId, obj.bucketName, obj.profileId, obj.appKey);
    };

exports = module.exports = {
    /**
     * Working with vars
     */
    getVars: function () {
        return vars;
    },
    setVars: function (obj) {
        vars = obj;
    },
    setVar: function (name, value) {
        vars[name] = value;
    },

    /**
     * Working with cache
     */
    disableCache: function () {
        cacheable = false;
    },

    enableCache: function () {
        cacheable = true;
    },

    hasCache: function () {
        return cacheable;
    },

    /**
     * Parse start session data
     */
    getDatas: function (req, callback) {
        var profile = req.body.profile,
            session = profile.sessions[0];

        if (!session.collectApp) {
            return callback(new Error('Custom not found'));
        }
        exports.setVar('collectApp', session.collectApp);

        if (!session.section) {
            return callback(new Error('Section not found'));
        }
        exports.setVar('section', session.section);

        if (!session.events[0].data) {
            return callback(new Error('Data not set'));
        }

        if (!profile.id) {
            return callback(new Error('Profile id not found'));
        }
        exports.setVar('profileId', profile.id);
        return callback(null, session.events[0].data);
    },

    /**
     * Get settings application
     * @param  Object   params   params have "vars"
     * @param  Function callback
     */
    getSettings: function (params, callback) {
        request.get(settingsAppUrl({
            groupId: params.vars.groupId,
            bucketName: params.vars.bucketName,
            appName: params.vars.appName,
            appKey: params.vars.appKey
        }), {
            auth: params.vars.auth
        }, function (error, response) {
            if (error || !response.body) {
                return callback(error || new Error('Empty response'));
            }
            var body;
            try {
                body = JSON.parse(response.body);
            } catch (e) {
                return callback(new Error('Parse JSON profile'));
            }
            if (!body.custom) {
                return callback(new Error('Custom not found'));
            }
            return callback(null, body.custom);
        });
    },

    /**
     * Update data profile by id
     * @param  Object   params   params have "vars" and "data"
     * @param  Function callback
     */
    updateProfile: function (params, callback) {
        request.post({
            url: profilesAppUrl({
                groupId: /*params.vars.groupId*/ 222,
                bucketName: /*params.vars.bucketName*/ 'first-bucket',
                profileId: /*params.vars.profileId*/ 'xjf8k76t1d7n807lhp8yjwqjbmw0j9sq',
                appKey: /*params.vars.appKey*/ 'XVNo1A1sFP9ly7U0'
            }),
            body: {
                id: params.vars.profileId,
                attributes: [{
                    collectApp: params.vars.collectApp,
                    section: params.vars.section,
                    data: params.data
                }]
            },
            json: true
        }, function (error, response) {
            if (error || !response.body) {
                return callback(error || new Error('Empty response'));
            }
            return callback(null);
        });
    },

    /**
     * Get data profile by id
     * @param  Object   params   params have "vars"
     * @param  Function callback
     */
    getProfile: function (params, callback) {
        request.get(profilesAppUrl({
            groupId: /*params.vars.groupId*/ 222,
            bucketName: /*params.vars.bucketName*/ 'first-bucket',
            profileId: /*params.vars.profileId*/ 'xjf8k76t1d7n807lhp8yjwqjbmw0j9sq',
            appKey: /*params.vars.appKey*/ 'XVNo1A1sFP9ly7U0'
        }), function (error, response) {
            if (error || !response.body) {
                return callback(error || new Error('Empty response'));
            }
            var body;
            try {
                body = JSON.parse(response.body);
            } catch (e) {
                return callback(new Error('Parse JSON profile'));
            }
            if (!body.profile) {
                return callback(new Error('Profile not found'));
            }
            return callback(null, body.profile);
        });

    }
};