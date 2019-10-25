/*global BOOMR*/

"use strict";

function injectedFunction() {

    const MONITOR_WINDOW = [
            "XMLHttpRequest",
            "fetch",
            "MutationObserver",
            "history",
            "addEventListener", "removeEventListener",
            "setTimeout", "clearTimeout",
            "setInterval", "clearInterval",
            "requestIdleCallback", "cancelIdleCallback",
            "performance",
            "requestAnimationFrame", "webkitRequestAnimationFrame",
            "cancelAnimationFrame", "webkitCancelAnimationFrame",
            "Promise",
            "CustomEvent",
            "onerror",
            "onhashchange",
            "onpopstate",
            "onmessage",
            "onunhandledrejection",
            "onstorage",
            "onunload",
            "Error"
        ],
        MONITOR_WINDOW_FORCED = [  // monitor these even if currently undefined
            "BOOMR_config",
            "BOOMR"
        ],
        MONITOR_HISTORY = [
            "pushState",
            "replaceState",
            "go",
            "back",
            "forward"
        ],
        MONITOR_NAVIGATOR = [
            "sendBeacon"
        ],
        MONITOR_EVENTTARGET = [
            "addEventListener",
            "removeEventListener"
        ],
        MONITOR_RESPONSE = [
            "arrayBuffer",
            "blob",
            "formData",
            "json",
            "text",
            "arrayBuffer",
            "blob",
            "formData",
            "json",
            "text"
        ],
        MONITOR_XHR = [
            "open",
            "send"
        ],
        MONITOR_PROMISE = [
            "all",
            "race",
            "resolve",
            "reject"
        ],
        MONITOR_PERFORMANCE = [
            "mark",
            "measure",
            "now",
            "getEntries",
            "getEntriesByName",
            "getEntriesByType",
            "onresourcetimingbufferfull",
            "clearResourceTimings",
            "clearMarks",
            "clearMeasures",
            "navigation",
            "timing",
            "timeOrigin",
            "memory",
            "setResourceTimingBufferSize"
            //webkitSetResourceTimingBufferSize
        ],
        MONITOR_MUTATIONOBSERVER = [
            "observe",
            "disconnect"
        ],
        MONITOR_CONSOLE = [
            "error",
            "warn",
            "log",
            "info",
            "clear"
        ];

    function monitorProp(obj, objName, prop, force) {
        if (force || (prop in obj && typeof obj[prop] !== "undefined")) {
            obj["__bi_native_" + prop] = obj[prop];
            Object.defineProperty(obj, prop, {
                get: function() {
                    return this["__bi_native_" + prop];
                },
                set: function __bi_set(newValue) {
                    var now = performance.now(), e;
                    // store the new value on `this` in case we're overriding a method up the prototype chain
                    this["__bi_native_" + prop] = newValue;
                    e = new Error();
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: {type: "override", native: objName + "." + prop, stack: e.stack, timeStamp: now}}));
                },
                //writable: true,
                configurable: true  // allow redefine
            });
        }
    }

    function monitorProps(obj, objName, props, force) {
        var i, prop;
        for (i = 0; i < props.length; i++) {
            prop = props[i];
            monitorProp(obj, objName, prop, force);
        }
    }

    function boomerangLoaded() {
        var apikey, scripts, i, script, data = {}, event;

        document.removeEventListener("onBoomerangLoaded", load);

        // check for non-blocking loader snippet in the base page.
        // Won't detect loads from tag managers or if included from other scripts
        scripts = window.document.getElementsByTagName("script");
        for (i = 0; i < scripts.length; i++) {
            script = scripts[i];
            // Akamai mPulse specific
            if (script.src && /go-mpulse\.net\/boomerang\//.test(script.src)) {
                data.injection = "script";
                data.scriptsrc = script.src;
                data.vendor = "Akamai mPulse";
            }
            // Akamai mPulse specific
            else if (!script.src && script.textContent && /go-mpulse\.net\/boomerang\//.test(script.textContent)) {
                data.vendor = "Akamai mPulse";
                if (/"ak\.v":/.test(script.textContent)) {
                    data.injection = "Edge";
                }
                else {
                    data.injection = "Origin";
                }
            }
        }

        data.version = BOOMR.version;

        monitorProps(BOOMR, "BOOMR", ["version"]);

        // Akamai mPulse specific
        apikey = window.BOOMR_API_key;
        if (apikey) {
            data.vendor = "Akamai mPulse";
        }
        else if (BOOMR.url) {
            var m = /\/boomerang\/([A-Z0-9-]{29})/.exec(BOOMR.url);
            if (m && m.length >= 2) {
                apikey = m[1];
                data.vendor = "Akamai mPulse";
            }
        }
        data.apikey = apikey;
        data.script_url = BOOMR.url;
        data.beacon_url = typeof BOOMR.getBeaconURL === "function" ? BOOMR.getBeaconURL() : undefined;
        data.config_url = BOOMR.config_url;

        //BOOMR.boomerang_frame === window.top

        data.BOOMR_config = window.BOOMR_config;

        // NCC Group specific
        if (window.NCCBOOMR) {
            data.vendor = "NCC RUM";
        }

        // send basic boomerang info to content-script
        window.dispatchEvent(new CustomEvent("BIInfoEvent", {detail: data}));

        // config event
        BOOMR.subscribe("config", function(config) {
            window.dispatchEvent(new CustomEvent("BIConfigEvent", {detail: config}));
        });

        // beacon event
        BOOMR.subscribe("beacon", function(beacon) {
            window.dispatchEvent(new CustomEvent("BIBeaconEvent", {detail: beacon}));
        });

        var EVENTS = ["page_ready", "page_unload", "before_unload", "dom_loaded", "visibility_changed", "prerender_to_visible",
            "before_beacon", "beacon", "page_load_beacon", "xhr_load", "click", "form_submit", "config", "xhr_init",
            "spa_init", "spa_navigation", "spa_cancel", "xhr_send", "xhr_error", "error", "netinfo", "rage_click",
            "interaction", "before_custom_beacon"];

        for (i = 0; i < EVENTS.length; i++) {
            event = EVENTS[i];
            BOOMR.subscribe(event, (function(evt) {
                return function() {
                    var now = performance.now(), e = new Error(), args, message;
                    try {
                        args = JSON.stringify(arguments);
                    } catch (err) {
                        // NOOP
                    }
                    message = {type: "boomrevent", event: evt, arguments: args, stack: e.stack, timeStamp: now};
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                };
            })(event));
        }
    }

    (function init(w) {
        var a = document.createElement("A");

        var flags = {
            instrumentHistory: true,
            monitorNatives: true
        };

        var observer, handler;

        // log something to make it easier to find this anonymous script in devtools
        console.log("Boomerang Inspector: init start @ " + performance.now());

        if (!performance) {
            console.log("Boomerang Inspector: performance not found, exiting");
            return;
        }

        window.BOOMR = window.BOOMR || {};
        BOOMR.plugins = BOOMR.plugins || {};
        BOOMR.plugins.BI = {
            init: function() {
                var now = performance.now(), e = new Error(), message = {type: "boomrevent", event: "init", arguments: JSON.stringify(arguments), stack: e.stack, timeStamp: now};
                window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
            },
            is_complete: function() {
                var now = performance.now(), e = new Error(), message = {type: "boomrevent", event: "is_complete", arguments: JSON.stringify(arguments), stack: e.stack, timeStamp: now};
                window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                return true;
            }
        };

        if (flags.instrumentHistory) {
            if (typeof history.pushState === "function") {
                history.pushState = (function(_pushState) {
                    return function __bi_pushState(state, title, url) {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        a.href = url;
                        //console.log("pushState (" + performance.now() + ") pushState, title: " + title + " url: " + a.href + " (old url: " + document.URL + ")");
                        message = {type: "call", method: "history.pushState", stack: e.stack, timeStamp: now, url: a.href, oldURL: document.URL};
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _pushState.apply(this, arguments);
                    };
                })(history.pushState);
            }

            if (typeof history.replaceState === "function") {
                history.replaceState = (function(_replaceState) {
                    return function __bi_replaceState(state, title, url) {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        a.href = url;
                        //console.log("replaceState (" + performance.now() + ") replaceState, title: " + title + " url: " + a.href + " (old url: " + document.URL + ")");
                        message = {type: "call", method: "history.replaceState", stack: e.stack, timeStamp: now, url: a.href, oldURL: document.URL};
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _replaceState.apply(this, arguments);
                    };
                })(history.replaceState);
            }

            if (typeof history.go === "function") {
                history.go = (function(_go) {
                    return function __bi_go(index) {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", method: "history.go", stack: e.stack, timeStamp: now, oldURL: document.URL};
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _go.apply(this, arguments);
                    };
                })(history.go);
            }

            if (typeof history.back === "function") {
                history.back = (function(_back) {
                    return function __bi_back() {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", method: "history.back", stack: e.stack, timeStamp: now, oldURL: document.URL};
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _back.apply(this, arguments);
                    };
                })(history.back);
            }

            if (typeof history.forward === "function") {
                history.forward = (function(_forward) {
                    return function __bi_forward() {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", method: "history.forward", stack: e.stack, timeStamp: now, oldURL: document.URL};
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _forward.apply(this, arguments);
                    };
                })(history.forward);
            }

            w.addEventListener("popstate", function(event) {
                var message;
                //console.log("popstate (" + event.timeStamp + ") " + JSON.stringify(event));
                message = {type: "event", event: "popstate", timeStamp: event.timeStamp, url: document.URL};
                window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
            });

            w.addEventListener("hashchange", function(event) {
                var message;
                //console.log("hashchange (" + event.timeStamp + ") url:" + event.newURL + " (old url: " + event.oldURL + ") " + JSON.stringify(event));
                message = {type: "event", event: "hashchange", timeStamp: event.timeStamp, url: event.URL, oldURL: event.oldURL};
                window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
            });
        }

        w.addEventListener("load", function(event) {
            var message;
            //console.log("load (" + event.timeStamp + ") " + JSON.stringify(event));
            message = {type: "event", event: "load", timeStamp: event.timeStamp};
            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        });

        w.document.addEventListener("DOMContentLoaded", function(event) {
            var message;
            //console.log("DOMContentLoaded (" + event.timeStamp + ") " + JSON.stringify(event));
            message = {type: "event", event: "DOMContentLoaded", timeStamp: event.timeStamp};
            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        }, false);

        w.document.addEventListener("readystatechange", function(event) {
            var message;
            //console.log("readystatechange (" + event.timeStamp + ") " + document.readyState + " " + JSON.stringify(event));
            message = {type: "event", event: "readystatechange", timeStamp: event.timeStamp, readyState: document.readyState};
            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        }, false);

        w.document.addEventListener("visibilitychange", function(event) {
            var message;
            //console.log("visibilitychange (" + event.timeStamp + ") " + document.visibilityState + " " + JSON.stringify(event));
            message = {type: "event", event: "visibilitychange", timeStamp: event.timeStamp, visibilityState: document.visibilityState};
            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        }, false);

        w.performance.addEventListener("resourcetimingbufferfull", function(event) {
            var message;
            //console.log("resourcetimingbufferfull (" + event.timeStamp + ") " + JSON.stringify(event));
            message = {type: "event", event: "resourcetimingbufferfull", timeStamp: event.timeStamp};
            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        });
        //performance.setResourceTimingBufferSize(5);

        if (window.PerformanceObserver) {
            observer = new PerformanceObserver(function(list, obj) {
                var now = performance.now(), message, entries = list.getEntries();
                var ENTRYTYPES = {
                    "navigation": "PerformanceNavigationTiming",
                    "mark": "PerformanceMark",
                    "measure": "PerformanceMeasure"
                };
                for (var i = 0; i < entries.length; i++) {
                    message = {type: "event", event: ENTRYTYPES[entries[i].entryType], entry: JSON.stringify(entries[i]), timeStamp: now};
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                }
            });
            observer.observe({entryTypes: ["navigation", "mark", "measure"]});
        }

        if (flags.monitorNatives) {
            // TODO: localStorage, cookies ?
            // monitor some important native objects in window
            monitorProps(w, "window", MONITOR_WINDOW);
            monitorProps(w, "window", MONITOR_WINDOW_FORCED, true);  // monitor these even if currently undefined

            // monitor some important native objects in history
            if (w.history) {
                monitorProps(history, "history", MONITOR_HISTORY);
            }

            // monitor some important native objects in navigator
            if (w.navigator) {
                monitorProps(navigator, "navigator", MONITOR_NAVIGATOR);
            }

            // monitor some important native objects in EventTarget
            if (w.EventTarget && EventTarget.prototype) {
                monitorProps(EventTarget.prototype, "EventTarget.prototype", MONITOR_EVENTTARGET);
            }

            // monitor some important native objects in Response
            if (w.Response && Response.prototype) {
                monitorProps(Response.prototype, "Response.prototype", MONITOR_RESPONSE);
            }

            // monitor some important native objects in XMLHttpRequest
            if (w.XMLHttpRequest && XMLHttpRequest.prototype) {
                monitorProps(XMLHttpRequest.prototype, "XMLHttpRequest.prototype", MONITOR_XHR);
            }

            // monitor some important native objects in Promise
            if (w.Promise) {
                monitorProps(Promise, "Promise", MONITOR_PROMISE);
            }

            if (w.performance) {
                // monitor calls to performance.clearResourceTimings
                if (typeof w.performance.clearResourceTimings === "function") {
                    handler = {
                        apply: function __bi_clearResourceTimings(target, thisArg, argumentsList) {
                            var now = performance.now(), e = new Error(), message;
                            message = {type: "call", method: "performance.clearResourceTimings", stack: e.stack, timeStamp: now};
                            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                            return target.apply(thisArg, argumentsList);
                        }
                    };
                    performance.clearResourceTimings = new Proxy(performance.clearResourceTimings, handler);
                }

                // monitor calls to performance.setResourceTimingBufferSize
                if (typeof w.performance.setResourceTimingBufferSize === "function") {
                    handler = {
                        apply: function __bi_setResourceTimingBufferSize(target, thisArg, argumentsList) {
                            var now = performance.now(), e = new Error(), message;
                            message = {type: "call", method: "performance.setResourceTimingBufferSize", stack: e.stack, timeStamp: now};
                            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                            return target.apply(thisArg, argumentsList);
                        }
                    };
                    performance.setResourceTimingBufferSize = new Proxy(performance.setResourceTimingBufferSize, handler);
                }

                // monitor some important native objects in performance
                monitorProps(performance, "performance", MONITOR_PERFORMANCE);
            }

            if (w.MutationObserver && MutationObserver.prototype) {
                // if (typeof w.MutationObserver.prototype.observe === "function") {
                //     MutationObserver.prototype.observe = (function(_observe) {
                //         return function __bi_observe() {
                //             // overriden by Boomerang Inspector
                //             var now = performance.now(), e = new Error(), message;
                //             message = {type: "call", method: "MutationObserver.prototype.observe", stack: e.stack, timeStamp: now};
                //             window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                //             return _observe.apply(this, arguments);
                //         };
                //     })(MutationObserver.prototype.observe);
                // }

                // monitor calls to MutationObserver disconnect
                if (typeof w.MutationObserver.prototype.disconnect === "function") {
                    MutationObserver.prototype.disconnect = (function(_disconnect) {
                        return function __bi_disconnect() {
                            // overriden by Boomerang Inspector
                            var now = performance.now(), e = new Error(), message;
                            message = {type: "call", method: "MutationObserver.prototype.disconnect", stack: e.stack, timeStamp: now};
                            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                            return _disconnect.apply(this, arguments);
                        };
                    })(MutationObserver.prototype.disconnect);
                }

                if (typeof w.MutationObserver.prototype.observe === "function") {
                    handler = {
                        apply: function __bi_observe(target, thisArg, argumentsList) {
                            var now = performance.now(), e = new Error(), message;
                            message = {type: "call", method: "MutationObserver.prototype.observe", stack: e.stack, timeStamp: now};
                            window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                            return target.apply(thisArg, argumentsList);
                        }
                    };

                    MutationObserver.prototype.observe = new Proxy(MutationObserver.prototype.observe, handler);
                }

                handler = {
                    apply: function __bi_disconnect(target, thisArg, argumentsList) {
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", method: "MutationObserver.prototype.disconnect", stack: e.stack, timeStamp: now};
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return target.apply(thisArg, argumentsList);
                    }
                };

                MutationObserver.prototype.disconnect = new Proxy(MutationObserver.prototype.disconnect, handler);

                monitorProps(MutationObserver.prototype, "MutationObserver.prototype", MONITOR_MUTATIONOBSERVER);
            }

            if (w.console) {
                monitorProps(console, "console", MONITOR_CONSOLE);
            }
        }

        if (w.BOOMR && typeof BOOMR.subscribe === "function") {
            boomerangLoaded();
        }
        else if (w.document && typeof document.addEventListener === "function") {
            document.addEventListener("onBoomerangLoaded", boomerangLoaded);
        }

        console.log("Boomerang Inspector: init end @ " + performance.now());
    })(window);
}
