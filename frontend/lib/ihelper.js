var PostMessanger = function () {
    this.messageStack = {};
    if (window.addEventListener) {
        window.addEventListener('message', this.messageHandler.bind(this));
    } else {
        window.attachEvent('onmessage', this.messageHandler.bind(this));
    }
};

PostMessanger.prototype = {
    messageHandler: function (message) {
        var data = {};
        try {
            data = JSON.parse(message.data);
        } catch (e) {
            return false;
        }

        if (!data.requestId || !this.messageStack[data.requestId] || !(this.messageStack[data.requestId] instanceof Function)) {
            return false;
        }

        return this.messageStack[data.requestId](data.success, data.message);
    },

    getUniqId: function () {
        return Math.round((Date.now() + window.performance.now()) * 1000);
    },

    sendMessage: function (data, callback) {
        if (data instanceof Object) {
            var id = this.getUniqId();

            data.requestId = id;

            try {
                data = JSON.stringify(data);
            } catch (e) {
                return false;
            }

            if (callback instanceof Function) {
                this.messageStack[id] = callback;
            }

            this.send(data);
        } else {
            return false;
        }
    },

    send: function (message) {
        if (window.parent) {
            window.parent.postMessage(message, '*');
        } else {
            throw Error('This page must be run in iframe.');
        }
    }
};

var IframeHelper = function () {
    this.ready = false;
    this.readyStack = [];
    this.pm = new PostMessanger();
    setTimeout(this.loadCurrentData.bind(this), 0);
};

IframeHelper.prototype = {
    onReady: function (callback) {
        this.addReadyListener(callback);
    },

    addReadyListener: function (callback) {
        if (this.ready) {
            callback();
        } else {
            this.readyStack.push(callback);
        }
    },

    dispatchReadyEvent: function () {
        this.ready = true;
        this.readyStack.forEach(function (fn) {
            if (fn instanceof Function) {
                fn();
            }
        });
    },

    request: function (codename, value, callback) {
        var data = {};
        if (arguments.length === 2 && value instanceof Function) {
            callback = value;
            value = null;
        }

        data.codename = codename;
        data.value = value;

        this.pm.sendMessage(data, callback);
    },

    loadCurrentData: function () {
        var self = this;
        this.request('gui.current.data', function (status, data) {
            if (!status) {
                throw Error(data);
            } else {
                self.currentData = data;
                self.dispatchReadyEvent();
            }
        });
    },
    //current data
    getCurrentUser: function () {
        return this.currentData.user;
    },

    getCurrentGroup: function () {
        return this.currentData.group;
    },

    getCurrentBucket: function () {
        return this.currentData.bucket;
    },

    getCurrentApp: function () {
        return this.currentData.app;
    },

    getProperties: function (callback) {
        this.request('app.settings', callback);
    },

    setProperties: function (values, callback) {
        this.request('app.settings;update', values, callback);
    },

    removeProperties: function (callback) {
        this.request('app.settings;delete', callback);
    },

    getProperty: function (property, callback) {
        this.request('app.property', {
            property: property
        }, callback);
    },

    setProperty: function (property, value, callback) {
        if (property) {
            this.request('app.property;update', {
                property: property,
                value: value
            }, callback);
        } else {
            callback(false, 'Property is undefined');
        }
    },

    removeProperty: function (property, callback) {
        if (property) {
            this.request('app.property;delete', property, callback);
        } else {
            callback(false, 'Property is undefined');
        }
    },

    getEventListeners: function (callback) {
        this.request('app.event.listeners', callback);
    },

    removeEventListener: function (codename, callback) {
        this.request('app.event.listener;delete', callback);
    },

    addEventListener: function (event, callback) {
        this.request('app.event.listener;create', event, callback);
    },

    getProfileSchema: function (callback) {
        this.request('app.profile.schema', callback);
    }

    /*

    getGuiCurrentUser: function (callback) {
        this.request('gui.current.user', callback);
    },

    getGuiCurrentGroup: function (callback) {
        this.request('gui.current.group', callback);
    },

    getGuiCurrentApp: function (callback) {
        this.request('gui.current.app', callback);
    },

    getGuiCurrentBucket: function (callback) {
        this.request('gui.current.bucket', callback);
    },

    getGuiCurrentData: function (callback) {
        this.request('gui.current', callback);
    },

    getGuiInstalledApps: function (callback) {
        this.request('gui.apps.installed', callback);
    },

    getGuiAvailableApps: function (callback) {
        this.request('gui.apps.available', callback);
    },

    getGuiAppsData: function (callback) {
        this.request('gui.apps', callback);
    },

    getGuiAppData: function (appId, callback) {
        this.request('gui.apps;'+appId, callback);
    },

    getGuiBucketList: function (callback) {
        this.request('gui.buckets', callback);
    },

    getGuiBucketData: function (bucketId, callback) {
        this.request('gui.buckets;'+bucketId, callback);
    },

    getGuiUsersList: function (callback) {
        this.request('gui.users', callback);
    },

    getGuiUserData: function (userId, callback) {
        this.request('gui.users;' + userId, callback);
    },

    getAppSettingsEvents: function (callback) {
        this.request('app.settings.events', callback);
    },

    removeAppSettingsEvent: function (id, callback) {
        this.request('app.settings.events;' + id + ';delete', callback);
    },

    addAppSettingsEvent: function(event, callback) {
        this.request('app.settings.events;' + event.key + ';create', event.value, callback);
    },

    getAppSettingsValues: function (callback) {
        this.request('app.settings.values', callback);
    },

    setAppSettingsValues: function (values, callback) {
        this.request('app.settings.values;' + ';update', values, callback);
    },

    getAppSettingsValue: function (prop, callback) {
        this.request('app.settings.values;' + prop, callback);
    },

    setAppSettingsValue: function (prop, value, callback) {
        this.request('app.settings.values;' + prop + ';update', value, callback);
    } */
};