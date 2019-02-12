import sync, { getFrameData, cancelSync } from 'framesync';

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
var startStream = function (create, props, onUpdate) {
    var latest;
    var lastUpdated = 0;
    var resolvedProps = __assign({}, props);
    var activeProps = {};
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
    var getLatest = create({
        error: handleError,
        complete: function () { return stop; },
        initial: __assign({}, resolvedProps)
    });
    var update = function (frame) {
        if (frame.timestamp !== lastUpdated) {
            latest = getLatest(resolvedProps, frame);
        }
        lastUpdated = frame.timestamp;
        return latest;
    };
    var updateListener = function (frame) {
        onUpdate(update(frame));
    };
    updateListener(getFrameData());
    sync.update(updateListener, true);
    var stop = function () {
        cancelSync.update(updateListener);
        for (var key in activeProps) {
            activeProps[key].stop();
        }
    };
    return {
        stop: stop,
        pull: function () { return update(getFrameData()); }
    };
};
var stream = function (create) {
    return function (props) { return ({
        start: function (onUpdate) { return startStream(create, props, onUpdate); }
    }); };
};

export { stream };
