/*globals injectedFunction*/

"use strict";

var browser = browser || chrome;

// connection to background script
var port = browser.runtime.connect({name: JSON.stringify({name: "content-script"})});

// listen for boomr messages from injected script
window.addEventListener("BIInfoEvent", function(event) {
    if (event && event.detail) {
        // forward to background page
        port.postMessage({type: "onInfo", data: event.detail});
    }
});

// listen for config messages from injected script
window.addEventListener("BIConfigEvent", function(event) {
    if (event && event.detail) {
        // forward to background page
        port.postMessage({type: "onConfig", data: event.detail});
    }
});

// listen for beacon messages from injected script
window.addEventListener("BIBeaconEvent", function(event) {
    if (event && event.detail) {
        // forward to background page
        port.postMessage({type: "onBeacon", data: event.detail});
    }
});

// listen for beacon messages from injected script
window.addEventListener("BIEvent", function(event) {
    if (event && event.detail) {
        // forward to background page
        port.postMessage({type: "onEvent", data: event.detail});
    }
});

// we don't have access to the variables in the window object of the base page so
// we'll inject a script into base page which will have access. The injected script will
// send us data via messages.
// Only injecting into the base page for now, not any iframes.
// Inject using textContent instead of src filename so that it runs asap
var s = document.createElement("script");
s.type = "text/javascript";
s.textContent = "(" + injectedFunction.toString() + ")();";
s.onload = function() {
    this.remove();
};
document.documentElement.appendChild(s);
