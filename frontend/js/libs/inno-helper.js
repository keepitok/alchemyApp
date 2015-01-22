var Loader = function () {
    $('body').append('<div id="curtain" style="display: none;"></div>');
    $('body').append('<div id="loader" style="display: none;" class="outer"><div class="middle"><div class="content"><div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div></div></div></div>');
    this.loaderEl = $('#loader');
    this.curtainEl = $('#curtain');
};

Loader.prototype = {
    show: function () {
        this.loaderEl.show();
        this.curtainEl.show();
    },
    hide: function () {
        this.loaderEl.hide();
        this.curtainEl.hide();
    }
};

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

};