'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var popcorn = require('@popmotion/popcorn');
var sync = require('framesync');
var sync__default = _interopDefault(sync);

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

var resolveObservable = function (definition) {
    var isComplete = false;
    var lastUpdated = 0;
    var latest;
    var update = typeof definition === 'function' ? definition : definition.update;
    return {
        update: function (props, frame) {
            if (!isComplete && frame.timestamp !== lastUpdated) {
                lastUpdated = frame.timestamp;
                latest = update(props, frame);
            }
            return latest;
        },
        complete: function () {
            isComplete = true;
            if (typeof definition !== 'function' && definition.complete) {
                definition.complete();
            }
        }
    };
};
var createObservable = function (create, complete, initialProps, fork) {
    var unforkedObservable = function () {
        return resolveObservable(create({
            error: handleError,
            complete: complete,
            initialProps: initialProps
        }));
    };
    if (!fork)
        return unforkedObservable();
    var forks = [];
    var numCompleted = 0;
    var forkComplete = function (i) { return function () {
        numCompleted++;
        forks[i].complete();
        if (numCompleted >= forks.length)
            complete();
    }; };
    var forkedObservable = fork({
        create: function (forkInitialProps) {
            var observable = resolveObservable(create({
                error: handleError,
                complete: forkComplete(forks.length),
                initialProps: forkInitialProps
            }));
            forks.push(observable);
            return observable;
        },
        initialProps: initialProps
    });
    return forkedObservable
        ? __assign({}, resolveObservable(forkedObservable), { complete: function () { return forks.forEach(function (thisFork) { return thisFork.complete(); }); } }) : unforkedObservable();
};

var startStream = function (config) {
    var create = config.create, props = config.props, defaultProps = config.defaultProps, subscription = config.subscription, fork = config.fork;
    var resolvedProps = __assign({}, defaultProps, props);
    var activeProps = {};
    var toResolve = Object.keys(props).filter(function (key) { return isStream(props[key]); });
    var numToResolve = toResolve.length;
    if (numToResolve) {
        var _loop_1 = function (i) {
            var key = toResolve[i];
            activeProps[key] = props[key].start(function (v) {
                resolvedProps[key] = v;
            });
        };
        for (var i = 0; i < numToResolve; i++) {
            _loop_1(i);
        }
    }
    var observable = createObservable(create, function () { return stop(); }, __assign({}, resolvedProps), fork);
    var update = function (frame) {
        return observable.update(resolvedProps, frame);
    };
    var updateListener = function (frame) {
        if (subscription.update) {
            subscription.update(update(frame));
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
            subscription.complete();
        }
        observable.complete();
    };
    return {
        stop: stop,
        pull: function () { return update(sync.getFrameData()); }
    };
};

var stream = function (create, defaultProps, fork) {
    var definedStream = function (props, transformer) {
        return {
            start: function (subscriptionDefinition) {
                var subscription = resolveSubscription(subscriptionDefinition);
                if (transformer) {
                    var update_1 = subscription.update;
                    subscription.update = function (v) { return update_1(transformer(v)); };
                }
                return startStream({
                    create: create,
                    props: props || {},
                    defaultProps: defaultProps,
                    subscription: subscription,
                    fork: fork
                });
            },
            pipe: function () {
                var funcs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    funcs[_i] = arguments[_i];
                }
                var piped = popcorn.pipe.apply(void 0, [transformer].concat(funcs).filter(Boolean));
                return definedStream(props, piped);
            }
        };
    };
    return definedStream;
};

exports.stream = stream;
