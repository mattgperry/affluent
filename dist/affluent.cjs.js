'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var sync = require('framesync');
var sync__default = _interopDefault(sync);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var handleError = function (err) {
    throw err;
};
var isStream = function (v) {
    return typeof v !== 'undefined' && v.hasOwnProperty('start');
};
var resolveSubscription = function (subscription) {
    if (typeof subscription === 'function') {
        return { update: subscription };
    }
    else {
        return subscription;
    }
};
var resolveObservable = function (observable) {
    if (typeof observable === 'function') {
        return { update: observable };
    }
    else {
        return observable;
    }
};
var startStream = function (create, props, subscriptionDefinition) {
    var latest;
    var lastUpdated = 0;
    var resolvedProps = __assign({}, props);
    var activeProps = {};
    var subscription = resolveSubscription(subscriptionDefinition);
    var toResolve = Object.keys(props).filter(function (key) { return isStream(props[key]); });
    var numToResolve = toResolve.length;
    if (numToResolve) {
        var _loop_1 = function (i) {
            var key = toResolve[i];
            activeProps[key] = props[key].start(function (v) { return (resolvedProps[key] = v); });
        };
        for (var i = 0; i < numToResolve; i++) {
            _loop_1(i);
        }
    }
    var observable = resolveObservable(create({
        error: handleError,
        complete: function () { return stop(); },
        initial: __assign({}, resolvedProps)
    }));
    var update = function (frame) {
        if (frame.timestamp !== lastUpdated) {
            latest = observable.update(resolvedProps, frame);
        }
        lastUpdated = frame.timestamp;
        return latest;
    };
    var updateListener = function (frame) {
        update(frame);
        if (subscription.update) {
            subscription.update(latest);
        }
    };
    updateListener(sync.getFrameData());
    sync__default.update(updateListener, true);
    var stop = function () {
        sync.cancelSync.update(updateListener);
        for (var key in activeProps) {
            activeProps[key].stop();
        }
        if (subscription.complete) {
            subscription.complete(latest);
        }
        if (observable.complete) {
            observable.complete();
        }
    };
    return {
        stop: stop,
        pull: function () { return update(sync.getFrameData()); }
    };
};
var stream = function (create) {
    return function (props) {
        if (props === void 0) { props = {}; }
        return ({
            start: function (subscription) {
                return startStream(create, props, subscription);
            }
        });
    };
};

exports.stream = stream;
