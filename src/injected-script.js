/*global BOOMR*/

"use strict";

export function injectedFunction(options) {
    options = JSON.parse(options);

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
            "Error",
            "PerformanceObserver"
        ],
        MONITOR_WINDOW_FORCED = [  // monitor these even if currently undefined
            "BOOMR_config",
            "BOOMR"
            // "event"  // might have side effects
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
            "setResourceTimingBufferSize", "webkitSetResourceTimingBufferSize"
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

    // PerformanceObserver.supportedEntryTypes
    // Chrome: ["element", "event", "first-input", "largest-contentful-paint", "layout-shift", "longtask", "mark", "measure", "navigation", "paint", "resource"]
    // FF: [ "mark", "measure", "navigation", "resource" ]
    const PERF_OBSERVE_TYPES = {
        "element": "PerformanceElementTiming",
        "event": "PerformanceEventTiming",
        "first-input": "first-input",  // doesn't have a unique interface? PerformanceEventTiming https://github.com/WICG/event-timing
        "largest-contentful-paint": "LargestContentfulPaint",  // https://github.com/WICG/largest-contentful-paint
        "layout-shift": "LayoutShift",  // PerformanceEntry https://github.com/WICG/layout-instability
        "longtask": "PerformanceLongTaskTiming",
        "mark": "PerformanceMark",
        "measure": "PerformanceMeasure",
        "navigation": "PerformanceNavigationTiming",
        "paint": "PerformancePaintTiming",
        "resource": "PerformanceResourceTiming"
        //"frame": "PerformanceFrameTiming"
    };

    // Reporting API https://w3c.github.io/reporting/
    const REPORT_ENTRY_NAMES = {
        "deprecation": "ReportingObserver deprecation",
        "intervention": "ReportingObserver intervention",
        "csp-violation": "ReportingObserver csp-violation"
    };

    const MONITOR_BOOMR_EVENTS = [
        // `beacon` and `config` will be monitored independantly
        "page_unload", "before_unload", "dom_loaded", "visibility_changed", "prerender_to_visible",
        "before_beacon", "beacon", "page_load_beacon", "xhr_load", "click", "form_submit", "config", "xhr_init",
        "spa_init", "spa_navigation", "spa_cancel", "xhr_send", "xhr_error", "error", "netinfo", "rage_click",
        "interaction", "before_custom_beacon"
    ];

    function monitorSetProp(obj, objName, prop, force) {
        if (force || (prop in obj && typeof obj[prop] !== "undefined")) {
            obj["__bi_native_" + prop] = obj[prop];
            Object.defineProperty(obj, prop, {
                get: function() {
                    return this["__bi_native_" + prop];
                },
                set: function __bi_set(newValue) {
                    var now = performance.now(), e = new Error();
                    // store the new value on `this` in case we're overriding a method up the prototype chain
                    this["__bi_native_" + prop] = newValue;
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: {type: "override", params: {native: objName + "." + prop}, stack: e.stack, timestamp: now}}));
                },
                //writable: true,
                configurable: true  // allow redefine
            });
        }
    }

    function monitorSetProps(obj, objName, props, force) {
        var i, prop;
        for (i = 0; i < props.length; i++) {
            prop = props[i];
            monitorSetProp(obj, objName, prop, force);
        }
    }

    /**
     * Proxy for BOOMR.session set property calls
     */
    function setupSessionProxy(session) {
        var handler_session = {
            set: function(obj, prop, value) {
                let now = performance.now(), e = new Error(), message;
                let oldvalue = obj[prop];
                obj[prop] = value;
                if (oldvalue !== value) {
                    message = {type: "session", params: {method: "BOOMR.session." + prop, oldvalue: oldvalue, value: value, session: obj}, stack: e.stack, timestamp: now};
                    window.dispatchEvent(new CustomEvent("BISessionEvent", {detail: message}));
                }
                return true;
            }
        };
        return new Proxy(session, handler_session);
    }

    /**
     * Proxy for BOOMR.plugins set property calls
     */
    function setupPluginsProxy(plugins) {
        var handler_plugins = {
            set: function(obj, prop, value) {
                let now = performance.now(), e = new Error(), message;
                let oldvalue = obj[prop];
                obj[prop] = value;
 
                if (oldvalue !== value) {
                    // console.log("PLUGINS: " + prop);
                    message = {type: "plugins", params: {method: "BOOMR.plugins." + prop}, stack: e.stack, timestamp: now};
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                }
                if (prop === "AutoXHR") {
                    setupAutoXHRPluginProxy();
                }
                return true;
            }
        };

        if (typeof plugins.AutoXHR !== "undefined") {
            // we injected late, the plugin is already defined
            setupAutoXHRPluginProxy();
        }
        return new Proxy(plugins, handler_plugins);
    }


    /**
     * Monitor AutoXHR/SPA pending events and sub-resources
     */
    function setupAutoXHRPluginProxy() {
        var mh = BOOMR.plugins.AutoXHR.getMutationHandler();

        var handler_resources = {
            set: function(obj, prop, value) {

                obj[prop] = value;

                if (/^\d+$/.test(prop)) {
                    //console.log("Inspector adding resource " + JSON.stringify(prop));
                
                    var now = performance.now(), e = new Error(), message;
                    message = {type: "track", params: {method: "autoxhr:resource:add"}, stack: e.stack, timestamp: now};
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                }

                return true;
            }
        };
        var handler_urls = {
            set: function(obj, prop, value) {
                obj[prop] = value;
                if (prop) {
                    //console.log("Inspector adding url " + JSON.stringify(prop) + ": " + JSON.stringify(value));

                    var now = performance.now(), e = new Error(), message;
                    message = {type: "track", params: {method: "autoxhr:url:add"}, stack: e.stack, timestamp: now, url: prop};
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                }
                return true;
            }
        };

        var handler_pending_events = {
            // get: function __bi_get(obj, prop) {
            //     /console.log("Inspector get " + JSON.stringify(prop));
            //     if (prop === "undefined") debugger;
            //     return obj[prop];
            // },
            set: function(obj, prop, value) {
                var now = performance.now(), e = new Error(), message;
                if (/^\d+$/.test(prop)) {
                    if (typeof value === "undefined") {
                        //console.log("Inspector removing event " + JSON.stringify(obj[prop]));

                        message = {type: "track", params: {method: "autoxhr:event:remove", data: obj[prop]}, stack: e.stack, timestamp: now};  // old value
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                    }
                    else {
                        //console.log("Inspector adding event " + JSON.stringify(prop) + ": " + JSON.stringify(value));
                        if (value.resources) {
                            value.resources = new Proxy(value.resources, handler_resources);  // monitor tracked resources
                        }

                        message = {type: "track", params: {method: "autoxhr:event:add", data: obj[prop]}, stack: e.stack, timestamp: now};  // old value
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));

                        value.urls = new Proxy(value.urls || {}, handler_urls);  // monitor tracked urls
                    }
                }
                obj[prop] = value;
                return true;
            }
        };
        mh.pending_events = new Proxy(mh.pending_events, handler_pending_events);
    }

    /**
     * Proxy for BOOMR.addVar method calls
     */
    function setupAddVarProxy(addVar) {
        var handler_addVar = {
            apply: function(target, thisArg, argumentsList) {
                // we want to capture the mPulse "h.d" config param
                if (argumentsList && argumentsList.length === 2) {
                    if (argumentsList[0] === "h.d") {
                        let now = performance.now(), e = new Error()
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: {type: "domain", params: {domain: argumentsList[1]}, stack: e.stack, timestamp: now}}));
                    }
                } else if (argumentsList && argumentsList.length === 3) {
                    if (argumentsList[0] === "h.pg") {
                        let now = performance.now(), e = new Error()
                        window.dispatchEvent(new CustomEvent("BIEvent", {detail: {type: "pageGroup", params: {pageGroup: argumentsList[1]}, stack: e.stack, timestamp: now}}));
                    }
                }
                return target.apply(thisArg, argumentsList);
              }
        }
        return new Proxy(addVar, handler_addVar);
    }

    function setupBOOMRProxy(boomr) {
        var handler_BOOMR = {
            set: function(obj, prop, value) {
                var now = performance.now(), e = new Error(), message;
                let oldvalue = obj[prop];

                if (oldvalue !== value) {  // check if the value changed so that we don't proxy our proxies
                    //console.log("BOOMR set " + prop);
                    if (prop === "session") {
                        //console.trace("BOOMR session overwrite");
                        value = setupSessionProxy(value);
                    }
                    else if (prop === "version" && typeof value === "string") {
                        // log a message to the console. The console will make a stack trace for this log entry and make it easy for us to find/debug this script
                        console.log(
                            `%c boomerang-inspector %c Detected Boomerang v${value} %c`,
                            'background:#35495e; padding: 1px; border-radius: 3px 0 0 3px; color: #fff;',
                            'background:#0099CC; padding: 1px; border-radius: 0 3px 3px 0; color: #fff;',
                            'background:transparent'
                        )
                    }
                    else if (prop === "snippetExecuted") {
                        if (e.stack && e.stack.length) {
                            let stack = e.stack.split("\n");
                            obj["loaderScript"] = stack[stack.length - 1];  // todo: parse better
                        }
                    }
                    else if (prop === "addVar") {
                        value = setupAddVarProxy(value);
                    }
                    else if (prop === "plugins")
                    {
                        value = setupPluginsProxy(value);
                    }
                }
                obj[prop] = value;

                message = {type: "boomr", params: {method: "BOOMR." + prop}, stack: e.stack, timestamp: now};
                window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));

                if (oldvalue !== value && prop === "subscribe")
                {
                    // this happens sooner than `onBoomerangLoaded` event
                    if (typeof value === "function") {
                        boomerangDetected();
                    }
                }

                return true;
            }
        };
        return new Proxy(boomr, handler_BOOMR);
    }

    /**
     * Get basic boomerang information (version, vendor, etc.) and subscribe to some boomr events
     */
    function boomerangDetected() {
        var apikey, scripts, i, script, data = {}, event;
        const now = performance.now(), e = new Error();

        // check for non-blocking loader snippet in the base page.
        // Won't detect loads from tag managers or if included from other scripts
        scripts = window.document.getElementsByTagName("script");
        for (i = 0; i < scripts.length; i++) {
            script = scripts[i];
            //console.log("SRC:" + script.src)
            // Akamai mPulse specific
            // look for a script src that loads mPulse boomr directly
            if (script.src && /go-mpulse\.net\/boomerang\//.test(script.src)) {
                data.injection = "script";
                data.scriptsrc = script.src;
                data.vendor = "Akamai mPulse";
                break;
            }
            // Akamai mPulse specific
            // check for a script node that references mPulse boomr
            else if (!script.src && script.textContent && /go-mpulse\.net\/boomerang\//.test(script.textContent)) {
                data.vendor = "Akamai mPulse";
                if (/"ak\.v":/.test(script.textContent)) {
                    data.injection = "Edge";
                }
                else {
                    data.injection = "Origin";
                }
                break;
            }
        }

        //todo: detect adobe, gtm, tealium, etc
        if (!data.injection && BOOMR.loaderScript) {
            data.scriptsrc = BOOMR.loaderScript;
            if (/ensighten.com\//.test(BOOMR.loaderScript)) {
                data.injection = "Ensighten";
            }
           // Ensighten (nexus.ensighten.com, nexus-test.ensighten.com)
           // Google Tag Manager (www.googletagmanager.com)
           // Adobe DTM/Launch (assets.adobedtm.com)
           // Tealium (tags.tiqcdn.com, collect.tealiumiq.com)
        }

        data.version = BOOMR.version;
        data.loaderVersion = BOOMR.loaderVersion;
        // snippetExecuted -> v11?

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
        window.dispatchEvent(new CustomEvent("BIInfoEvent", {detail: {params: data, stack: e.stack, timestamp: now}}));

        // config event. `onconfig` (now renamed to `config`) should work in all versions of Boomerang
        BOOMR.subscribe("onconfig", function(config) {
            const now = performance.now(), e = new Error();
            if (config && !config.primary) { // ignore the config call from init() for now
                window.dispatchEvent(new CustomEvent("BIConfigEvent", {detail: {params: config, stack: e.stack, timestamp: now}}));
            }
        });

        // beacon event. `onbeacon` (now renamed to `beacon`) should work in all versions of Boomerang
        BOOMR.subscribe("onbeacon", function(beacon) {
            const now = performance.now(), e = new Error();
            window.dispatchEvent(new CustomEvent("BIBeaconEvent", {detail: {params: beacon, stack: e.stack, timestamp: now}}));
        });

        for (i = 0; i < MONITOR_BOOMR_EVENTS.length; i++) {
            event = MONITOR_BOOMR_EVENTS[i];
            BOOMR.subscribe(event, (function(evt) {
                return function() {
                    var now = performance.now(), e = new Error(), args, message;
                    try {
                        args = JSON.stringify(arguments);
                    }
                    catch (err) {
                        // NOOP
                    }
                    message = {type: "boomrevent", params: {event: evt, arguments: args}, stack: e.stack, timestamp: now};
                    window.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                };
            })(event));
        }
    }

    (function init(w) {
        const a = document.createElement("A");

        var observer, handler;

        // log something to make it easier to find this anonymous script in devtools
        //console.log("Boomerang Inspector: init start @ " + performance.now());

        if (!performance) {
            console.log("Boomerang Inspector: performance not found, exiting");
            return;
        }

        // create a `BI` boomerang plugin so that we can monitor plugin events
        w.BOOMR = w.BOOMR || {};

        BOOMR.plugins = BOOMR.plugins || {};
        BOOMR.plugins.BI = {
            init: function() {
                var now = performance.now(), e = new Error(), message = {type: "boomrevent", params: {event: "init", arguments: JSON.stringify(arguments)}, stack: e.stack, timestamp: now};
                w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
            },
            is_complete: function() {
                var now = performance.now(), e = new Error(), message = {type: "boomrevent", params: {event: "is_complete", arguments: JSON.stringify(arguments)}, stack: e.stack, timestamp: now};
                w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                return true;
            }
        };

        if (options.monitorHistory) {
            if (typeof history.pushState === "function") {
                history.pushState = (function(_pushState) {
                    return function __bi_pushState(state, title, url) {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        a.href = url;
                        //console.log("pushState (" + performance.now() + ") pushState, title: " + title + " url: " + a.href + " (old url: " + document.URL + ")");
                        message = {type: "call", params: {method: "history.pushState", url: a.href, oldURL: document.URL}, stack: e.stack, timestamp: now};
                        w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
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
                        message = {type: "call", params: {method: "history.replaceState", url: a.href, oldURL: document.URL}, stack: e.stack, timestamp: now};
                        w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _replaceState.apply(this, arguments);
                    };
                })(history.replaceState);
            }

            if (typeof history.go === "function") {
                history.go = (function(_go) {
                    return function __bi_go(index) {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", params: {method: "history.go", oldURL: document.URL}, stack: e.stack, timestamp: now};
                        w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _go.apply(this, arguments);
                    };
                })(history.go);
            }

            if (typeof history.back === "function") {
                history.back = (function(_back) {
                    return function __bi_back() {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", params: {method: "history.back", oldURL: document.URL}, stack: e.stack, timestamp: now};
                        w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _back.apply(this, arguments);
                    };
                })(history.back);
            }

            if (typeof history.forward === "function") {
                history.forward = (function(_forward) {
                    return function __bi_forward() {
                        // overriden by Boomerang Inspector
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", params: {method: "history.forward", oldURL: document.URL}, stack: e.stack, timestamp: now};
                        w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return _forward.apply(this, arguments);
                    };
                })(history.forward);
            }

            w.addEventListener("popstate", function(event) {
                var message;
                //console.log("popstate (" + event.timeStamp + ") " + JSON.stringify(event));
                message = {type: "event", params: {event: "popstate", url: document.URL}, timestamp: event.timeStamp};
                w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
            });

            w.addEventListener("hashchange", function(event) {
                var message;
                //console.log("hashchange (" + event.timeStamp + ") url:" + event.newURL + " (old url: " + event.oldURL + ") " + JSON.stringify(event));
                message = {type: "event", params: {event: "hashchange", url: event.URL, oldURL: event.oldURL}, timestamp: event.timeStamp};
                w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
            });
        }

        w.addEventListener("load", function(event) {
            var message;
            //console.log("load (" + event.timeStamp + ") " + JSON.stringify(event));
            message = {type: "event", params: {event: "load"}, timestamp: event.timeStamp};
            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        });

        w.addEventListener("unhandledrejection", function(event) {
            var message;
            //console.log("unhandledrejection (" + event.timeStamp + ") " + JSON.stringify(event));
            message = {type: "event", params: {event: "unhandledrejection"}, timestamp: event.timeStamp};
            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        });

        w.document.addEventListener("DOMContentLoaded", function(event) {
            var message;
            //console.log("DOMContentLoaded (" + event.timeStamp + ") " + JSON.stringify(event));
            message = {type: "event", params: {event: "DOMContentLoaded"}, timestamp: event.timeStamp};
            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));

            // look for boomr iframe
            //debugger;
        }, false);

        w.document.addEventListener("readystatechange", function(event) {
            var message;
            //console.log("readystatechange (" + event.timeStamp + ") " + document.readyState + " " + JSON.stringify(event));
            message = {type: "event", params: {event: "readystatechange", readyState: document.readyState}, timestamp: event.timeStamp};
            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        }, false);

        w.document.addEventListener("visibilitychange", function(event) {
            var message;
            //console.log("visibilitychange (" + event.timeStamp + ") " + document.visibilityState + " " + JSON.stringify(event));
            message = {type: "event", params: {event: "visibilitychange", visibilityState: document.visibilityState}, timestamp: event.timeStamp};
            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        }, false);

        w.performance.addEventListener("resourcetimingbufferfull", function(event) {
            var message;
            //console.log("resourcetimingbufferfull (" + event.timeStamp + ") " + JSON.stringify(event));
            message = {type: "event", params: {event: "resourcetimingbufferfull"}, timestamp: event.timeStamp};
            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
        });

        if (w.PerformanceObserver && PERF_OBSERVE_TYPES) {
            observer = new PerformanceObserver(function(list, obj) {
                var now = performance.now(), message, entries = list.getEntries(), entry;
                for (var i = 0; i < entries.length; i++) {
                    try {
                        entry = JSON.stringify(entries[i]);
                    }
                    catch (err) {
                        entry = "Type: " + typeof entries[i];
                    }
                    // check if (PerformanceObserver.supportedEntryTypes.includes(entries[i].entryType)) ? marked as `Experimental` on MDN
                    message = {type: "event", params: {event: PERF_OBSERVE_TYPES[entries[i].entryType], entry: entry}, timestamp: now};
                    w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                }
            });
            observer.observe({entryTypes: Object.keys(PERF_OBSERVE_TYPES)});
        }

        if (w.ReportingObserver) {
            observer = new ReportingObserver(function(reports, obj) {
                var now = performance.now(), message;
                for (var i = 0; i < reports.length; i++) {
                    const report = reports[i];
                    // JSON.stringify doesn't work for report
                    const event = {
                        type: report.type,
                        message: (report && report.body && (report.body.message || report.body.reason || (report.body.blockedURL && "CSP Violation; Blocked URL: " + report.body.blockedURL))) || report.type || "??",
                        fileName: report.body.sourceFile || report.url,
                        lineNumber: report.body.lineNumber,
                        columnNumber: report.body.columnNumber
                    };
                    message = {type: "event", params: {event: REPORT_ENTRY_NAMES[reports[i].type], entry: JSON.stringify(event)}, timestamp: now};
                    w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                }
            }, {
                buffered: true,
                types: Object.keys(REPORT_ENTRY_NAMES)
            });
            observer.observe();
        }
        else {
            w.document.addEventListener("securitypolicyviolation", function(event) {
                var message;
                //console.log("securitypolicyviolation (" + event.timeStamp + ") " + JSON.stringify(event));
                message = {type: "event", params: {event: "securitypolicyviolation"}, timestamp: event.timeStamp};
                w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
            });
        }

        if (options.monitorNatives) {
            // TODO: localStorage ?
            // monitor some important native objects in window
            monitorSetProps(w, "window", MONITOR_WINDOW);
            monitorSetProps(w, "window", MONITOR_WINDOW_FORCED, true);  // monitor these even if currently undefined

            // monitor some important native objects in history
            if (w.history) {
                monitorSetProps(history, "history", MONITOR_HISTORY);
            }

            // monitor some important native objects in navigator
            if (w.navigator) {
                monitorSetProps(navigator, "navigator", MONITOR_NAVIGATOR);
            }

            // monitor some important native objects in EventTarget
            if (w.EventTarget && EventTarget.prototype) {
                monitorSetProps(EventTarget.prototype, "EventTarget.prototype", MONITOR_EVENTTARGET);
            }

            // monitor some important native objects in Response
            if (w.Response && Response.prototype) {
                monitorSetProps(Response.prototype, "Response.prototype", MONITOR_RESPONSE);
            }

            // monitor some important native objects in XMLHttpRequest
            if (w.XMLHttpRequest && XMLHttpRequest.prototype) {
                monitorSetProps(XMLHttpRequest.prototype, "XMLHttpRequest.prototype", MONITOR_XHR);
            }

            // monitor some important native objects in Promise
            if (w.Promise) {
                monitorSetProps(Promise, "Promise", MONITOR_PROMISE);
            }

            // monitor calls to performance.clearResourceTimings
            if (typeof w.performance.clearResourceTimings === "function") {
                handler = {
                    apply: function __bi_clearResourceTimings(target, thisArg, argumentsList) {
                        var now = performance.now(), e = new Error(), message;
                        message = {type: "call", params: {method: "performance.clearResourceTimings"}, stack: e.stack, timestamp: now};
                        w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
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
                        message = {type: "call", params: {method: "performance.setResourceTimingBufferSize"}, stack: e.stack, timestamp: now};
                        w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                        return target.apply(thisArg, argumentsList);
                    }
                };
                performance.setResourceTimingBufferSize = new Proxy(performance.setResourceTimingBufferSize, handler);
            }

            // monitor some important native objects in performance
            monitorSetProps(performance, "performance", MONITOR_PERFORMANCE);

            if (w.MutationObserver && MutationObserver.prototype) {
                // monitor calls to MutationObserver observe
                if (typeof w.MutationObserver.prototype.observe === "function") {
                    handler = {
                        apply: function __bi_observe(target, thisArg, argumentsList) {
                            var now = performance.now(), e = new Error(), message;
                            message = {type: "call", params: {method: "MutationObserver.prototype.observe"}, stack: e.stack, timestamp: now};
                            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                            return target.apply(thisArg, argumentsList);
                        }
                    };

                    MutationObserver.prototype.observe = new Proxy(MutationObserver.prototype.observe, handler);
                }

                // monitor calls to MutationObserver disconnect
                if (typeof MutationObserver.prototype.disconnect === "function") {
                    handler = {
                        apply: function __bi_disconnect(target, thisArg, argumentsList) {
                            var now = performance.now(), e = new Error(), message;
                            message = {type: "call", params: {method: "MutationObserver.prototype.disconnect"}, stack: e.stack, timestamp: now};
                            w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                            return target.apply(thisArg, argumentsList);
                        }
                    };

                    MutationObserver.prototype.disconnect = new Proxy(MutationObserver.prototype.disconnect, handler);
                }

                // monitor some important native objects in MutationObserver
                monitorSetProps(MutationObserver.prototype, "MutationObserver.prototype", MONITOR_MUTATIONOBSERVER);
            }

            // monitor some important native objects in console
            if (w.console) {
                monitorSetProps(console, "console", MONITOR_CONSOLE);
            }
        }

        if (options.monitorCookies) {
            try {
                var cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie") ||
                Object.getOwnPropertyDescriptor(HTMLDocument.prototype, "cookie");
                if (cookieDesc && cookieDesc.configurable) {
                    Object.defineProperty(document, "cookie", {
                        get: function () {
                            return cookieDesc.get.call(document);
                        },
                        set: function (val) {
                            // only check RT cookie for now
                            if (/RT=/.test(val)) {
                                let now = performance.now(), e = new Error(), message;
                                message = {type: "cookie", params: {name: "RT", value: val}, stack: e.stack, timestamp: now};
                                w.dispatchEvent(new CustomEvent("BIEvent", {detail: message}));
                            }
                            cookieDesc.set.call(document, val);
                        }
                    });
                }
            }
            catch (err) {
                console.error("BI " + err);
            }
        }

        w.BOOMR.plugins = setupPluginsProxy(w.BOOMR.plugins);
        w.BOOMR = setupBOOMRProxy(w.BOOMR);

        // if `subscribe` isn't yet available, we'll know when it is declared using the proxy which
        // will occur earlier than listening for the `onBoomerangLoaded` event
        if (typeof w.BOOMR.subscribe === "function") {
            boomerangDetected();
        }
        //console.log("Boomerang Inspector: init end @ " + performance.now());
    })(window);
}
