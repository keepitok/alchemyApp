var util = require('util'),
    request = require('request');

var vars = {},
    cache = {},
    cachedTime = 300;

var settingsAppUrl = function (obj) {
        return util.format(vars.apiUrl + '/v1/companies/%s/buckets/%s/apps/%s/custom?app_key=%s', obj.groupId, obj.bucketName, obj.appName, obj.appKey);
    },
    profilesAppUrl = function (obj) {
        return util.format(vars.apiUrl + '/v1/companies/%s/buckets/%s/profiles/%s?app_key=%s', obj.groupId, obj.bucketName, obj.profileId, obj.appKey);
    };

var getKeyForChache = function (name, params) {
    return name + JSON.stringify(params);
};

var getCache = function (name, params) {
    if (!cachedTime || params.noCache) {
        return false;
    }
    var key = getKeyForChache(name, params);
    if (cache.hasOwnProperty(key)) {
        if (cache[key].expired < Date.now()) {
            delete cache[key];
            return false;
        } else {
            return cache[key].value;
        }
    }
    return false;
};

var setCache = function (name, params, value) {
    if (!cachedTime || params.noCache) {
        return;
    }
    value = value || true;
    var key = getKeyForChache(name, params);
    cache[key] = {
        expired: Date.now() + (cachedTime * 1000),
        value: value
    };
};

exports = module.exports = {
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
        var cachedValue = getCache('getSettings', params);
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
            setCache('getSettings', params, body.custom);
            return callback(null, body.custom);
        });
    },

    /**
     * Update data profile by id
     * @param  Object   params   params have "vars" and "data"
     * @param  Function callback
     */
    updateProfile: function (params, callback) {
        var cachedValue = getCache('updateProfile', params);
        if (cachedValue) {
            return callback(null);
        }
        var url = profilesAppUrl({
            groupId: params.vars.groupId,
            bucketName: params.vars.bucketName,
            profileId: params.vars.profileId,
            appKey: params.vars.appKey
                // groupId: 310,
                // bucketName: 'testalch',
                // profileId: 'myqyia15bf3oc72r878usybto85nquki',
                // appKey: '30r22Cj43U7J0WG2'
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
            setCache('updateProfile', params);
            return callback(null);
        });
    },

    /**
     * Get data profile by id
     * @param  Object   params   params have "vars"
     * @param  Function callback
     */
    getProfile: function (params, callback) {
        var cachedValue = getCache('getProfile', params);
        if (cachedValue) {
            return callback(null, cachedValue);
        }
        var url = profilesAppUrl({
            groupId: params.vars.groupId,
            bucketName: params.vars.bucketName,
            profileId: params.vars.profileId,
            appKey: params.vars.appKey,
            // groupId: 310,
            // bucketName: 'testalch',
            // profileId: 'myqyia15bf3oc72r878usybto85nquki',
            // appKey: '30r22Cj43U7J0WG2'
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
                profile.attributes.length &&
                profile.attributes[0].data) {
                attributes = profile.attributes[0].data;
            }
            setCache('getProfile', params, attributes);
            return callback(null, attributes);
        });

    }
};