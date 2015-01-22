var util = require('util'),
    request = require('request');

var vars = {},
    cache = {},
    cachedTime = 10;

var webProfilesAppUrl = function (obj) {
        return util.format('%s/v1/companies/%s/buckets/%s/profiles/%s', vars.apiUrl, obj.groupId, obj.bucketName, obj.profileId);
    },
    profilesAppUrl = function (obj) {
        return util.format('%s?app_key=%s', webProfilesAppUrl(obj), obj.appKey);
    },
    settingsAppUrl = function (obj) {
        return util.format('%s/v1/companies/%s/buckets/%s/apps/%s/custom?app_key=%s', vars.apiUrl, obj.groupId, obj.bucketName, obj.appName, obj.appKey);
    };

var getCache = function (name, params) {
    if (!cachedTime || params.noCache) {
        return;
    }
    if (cache.hasOwnProperty(name)) {
        if (cache[name].expired <= Date.now()) {
            delete cache[name];
            return;
        } else {
            return cache[name].value;
        }
    }
    return;
};

var setCache = function (name, params, value) {
    if (!cachedTime || params.noCache) {
        return;
    }
    cache[name] = {
        expired: Date.now() + (cachedTime * 1000),
        value: value || true
    };
};

var expireCache = function (name) {
    if (cache.hasOwnProperty(name)) {
        cache[name].expired = 0;
    }
};

exports = module.exports = {
    /**
     * Profile url
     */
    webProfilesAppUrl: webProfilesAppUrl,

    /**
     * Working with cache
     */
    clearCache: function () {
        cache = {};
    },
    setCachedTime: function (time) {
        cachedTime = time;
    },

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
     * Parse start session data
     */
    getDatas: function (req, callback) {
        if (!(req.body && req.body.profile)) {
            return callback(new Error('Profile not found'));
        }
        var profile = req.body.profile;

        if (!(profile.sessions && profile.sessions.length)) {
            return callback(new Error('Session not found'));
        }
        var session = profile.sessions[0];

        if (!session.collectApp) {
            return callback(new Error('CollectApp not found'));
        }
        exports.setVar('collectApp', session.collectApp);

        if (!session.section) {
            return callback(new Error('Section not found'));
        }
        exports.setVar('section', session.section);

        if (!(session.events && session.events.length && session.events[0].data)) {
            return callback(new Error('Data not set'));
        }
        if (!profile.id) {
            return callback(new Error('Profile id not found'));
        }
        exports.setVar('profileId', profile.id);

        return callback(null, {
            profile: profile,
            session: session,
            event: session.events[0],
            data: session.events[0].data
        });
    },

    /**
     * Get settings application
     */
    getSettings: function (params, callback) {
        var cachedValue = getCache('settings' + params.vars.appName, params);
        if (cachedValue) {
            return callback(null, cachedValue);
        }
        var url = settingsAppUrl({
            groupId: params.vars.groupId,
            bucketName: params.vars.bucketName,
            appName: params.vars.appName,
            appKey: params.vars.appKey
        });
        request.get(url, function (error, response) {
            if (error) {
                return callback(error);
            }
            var body;
            try {
                body = JSON.parse(response.body);
            } catch (e) {
                return callback(new Error('Parse JSON settings (' + url + ')'));
            }
            if (!body.hasOwnProperty('custom')) {
                return callback(new Error('Custom not found'));
            }
            setCache('settings' + params.vars.appName, params, body.custom);
            return callback(null, body.custom);
        });
    },

    /**
     * Update data profile by id
     */
    setAttributes: function (params, callback) {
        var url = profilesAppUrl({
            groupId: params.vars.groupId,
            bucketName: params.vars.bucketName,
            profileId: params.vars.profileId,
            appKey: params.vars.appKey
        });
        request.post({
            url: url,
            body: {
                id: params.vars.profileId,
                attributes: [{
                    collectApp: params.vars.collectApp,
                    section: params.vars.section,
                    data: params.data
                }]
            },
            json: true
        }, function (error) {
            if (error) {
                return callback(error);
            }
            expireCache('attributes' + params.vars.profileId);
            return callback(null);
        });
    },

    /**
     * Get data profile by id
     */
    getAttributes: function (params, callback) {
        var cachedValue = getCache('attributes' + params.vars.profileId, params);
        if (cachedValue) {
            return callback(null, cachedValue);
        }
        var url = profilesAppUrl({
            groupId: params.vars.groupId,
            bucketName: params.vars.bucketName,
            profileId: params.vars.profileId,
            appKey: params.vars.appKey
        });
        request.get(url, function (error, response) {
            if (error) {
                return callback(error);
            }
            var body;
            try {
                body = JSON.parse(response.body);
            } catch (e) {
                return callback(new Error('Parse JSON profile (' + url + ')'));
            }
            var profile = body.profile;
            if (!profile) {
                return callback(new Error('Profile not found'));
            }
            var attributes = [];
            if (profile.attributes &&
                profile.attributes.length) {
                attributes = profile.attributes;
            }
            setCache('attributes' + params.vars.profileId, params, attributes);
            return callback(null, attributes);
        });

    }
};