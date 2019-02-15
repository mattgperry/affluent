(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.affluent = {}));
}(this, function (exports) { 'use strict';

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

    var HEY_LISTEN = 'Hey, listen! ';
    var invariant = function () { };
    {
        invariant = function (check, message) {
            if (!check) {
                throw new Error(HEY_LISTEN.toUpperCase() + message);
            }
        };
    }

    var prevTime = 0;
    var onNextFrame = typeof window !== 'undefined' && window.requestAnimationFrame !== undefined
        ? function (callback) { return window.requestAnimationFrame(callback); }
        : function (callback) {
            var timestamp = Date.now();
            var timeToCall = Math.max(0, 16.7 - (timestamp - prevTime));
            prevTime = timestamp + timeToCall;
            setTimeout(function () { return callback(prevTime); }, timeToCall);
        };

    var createStep = (function (setRunNextFrame) {
        var processToRun = [];
        var processToRunNextFrame = [];
        var numThisFrame = 0;
        var isProcessing = false;
        var i = 0;
        var cancelled = new WeakSet();
        var toKeepAlive = new WeakSet();
        var renderStep = {
            cancel: function (process) {
                var indexOfCallback = processToRunNextFrame.indexOf(process);
                cancelled.add(process);
                if (indexOfCallback !== -1) {
                    processToRunNextFrame.splice(indexOfCallback, 1);
                }
            },
            process: function (frame) {
                var _a;
                isProcessing = true;
                _a = [
                    processToRunNextFrame,
                    processToRun
                ], processToRun = _a[0], processToRunNextFrame = _a[1];
                processToRunNextFrame.length = 0;
                numThisFrame = processToRun.length;
                if (numThisFrame) {
                    var process_1;
                    for (i = 0; i < numThisFrame; i++) {
                        process_1 = processToRun[i];
                        process_1(frame);
                        if (toKeepAlive.has(process_1) === true && !cancelled.has(process_1)) {
                            renderStep.schedule(process_1);
                            setRunNextFrame(true);
                        }
                    }
                }
                isProcessing = false;
            },
            schedule: function (process, keepAlive, immediate) {
                if (keepAlive === void 0) { keepAlive = false; }
                if (immediate === void 0) { immediate = false; }
                invariant(typeof process === 'function', 'Argument must be a function');
                var addToCurrentBuffer = immediate && isProcessing;
                var buffer = addToCurrentBuffer ? processToRun : processToRunNextFrame;
                cancelled.delete(process);
                if (keepAlive)
                    toKeepAlive.add(process);
                if (buffer.indexOf(process) === -1) {
                    buffer.push(process);
                    if (addToCurrentBuffer)
                        numThisFrame = processToRun.length;
                }
            }
        };
        return renderStep;
    });

    var StepId;
    (function (StepId) {
        StepId["Read"] = "read";
        StepId["Update"] = "update";
        StepId["Render"] = "render";
        StepId["PostRender"] = "postRender";
        StepId["FixedUpdate"] = "fixedUpdate";
    })(StepId || (StepId = {}));

    var maxElapsed = 40;
    var defaultElapsed = (1 / 60) * 1000;
    var useDefaultElapsed = true;
    var willRunNextFrame = false;
    var isProcessing = false;
    var frame = {
        delta: 0,
        timestamp: 0
    };
    var stepsOrder = [
        StepId.Read,
        StepId.Update,
        StepId.Render,
        StepId.PostRender
    ];
    var setWillRunNextFrame = function (willRun) { return (willRunNextFrame = willRun); };
    var _a = stepsOrder.reduce(function (acc, key) {
        var step = createStep(setWillRunNextFrame);
        acc.sync[key] = function (process, keepAlive, immediate) {
            if (keepAlive === void 0) { keepAlive = false; }
            if (immediate === void 0) { immediate = false; }
            if (!willRunNextFrame)
                startLoop();
            step.schedule(process, keepAlive, immediate);
            return process;
        };
        acc.cancelSync[key] = function (process) { return step.cancel(process); };
        acc.steps[key] = step;
        return acc;
    }, {
        steps: {},
        sync: {},
        cancelSync: {}
    }), steps = _a.steps, sync = _a.sync, cancelSync = _a.cancelSync;
    var processStep = function (stepId) { return steps[stepId].process(frame); };
    var processFrame = function (timestamp) {
        willRunNextFrame = false;
        frame.delta = useDefaultElapsed
            ? defaultElapsed
            : Math.max(Math.min(timestamp - frame.timestamp, maxElapsed), 1);
        if (!useDefaultElapsed)
            defaultElapsed = frame.delta;
        frame.timestamp = timestamp;
        isProcessing = true;
        stepsOrder.forEach(processStep);
        isProcessing = false;
        if (willRunNextFrame) {
            useDefaultElapsed = false;
            onNextFrame(processFrame);
        }
    };
    var startLoop = function () {
        willRunNextFrame = true;
        useDefaultElapsed = true;
        if (!isProcessing)
            onNextFrame(processFrame);
    };
    var getFrameData = function () { return frame; };

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
        updateListener(getFrameData());
        sync.update(updateListener, true);
        var stop = function () {
            cancelSync.update(updateListener);
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
            pull: function () { return update(getFrameData()); }
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

    Object.defineProperty(exports, '__esModule', { value: true });

}));
