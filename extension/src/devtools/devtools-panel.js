/*globals getBeaconType*/

"use strict";

var browser = browser || chrome;

var tabId = browser.devtools.inspectedWindow.tabId;

var COLUMNS = [
    "pid",
    "n",
    "beacon_type",
    "page_group",
    "u",
    "rt.tstart",
    "t_resp",
    "t_page",
    "t_done"
];

var boomr;
var config;
var events = [];

// See https://developer.chrome.com/extensions/sandboxingEval
var sandboxIframe;

function refreshInfo() {
    if (boomr) {
        document.getElementById("version").innerHTML = boomr.version || "";
        document.getElementById("apikey").innerHTML = boomr.apikey || "";
    }
    else {
        document.getElementById("version").innerHTML = "";
        document.getElementById("apikey").innerHTML = "";
    }
}

function refreshConfig() {
    var message;
    if (config && sandboxIframe) {
        message = {
            command: "render",
            name: "template-content-config",
            target: "content-config",
            context: {
                overrides: JSON.stringify(boomr.BOOMR_config, null, 4),
                config: JSON.stringify(config, null, 4)
            }
        };

        sandboxIframe.contentWindow.postMessage(message, "*");
    }
}

function refreshEvents() {
    var message;
    if (sandboxIframe) {
        message = {
            command: "render",
            name: "template-content-events",
            target: "content-events",
            context: {columns: COLUMNS, data: events}
        };

        sandboxIframe.contentWindow.postMessage(message, "*");
    }
}

function addBeacon(beacon) {
    beacon.beacon_type = getBeaconType(beacon);
    beacon.page_group = beacon["xhr.pg"] || beacon["h.pg"];
    events.push(beacon);
}

browser.runtime.sendMessage({type: "getInfo", tabId: tabId}, function(data) {
    boomr = data;
    refreshInfo();
});

// connection to background script.
// Send the inspected tabId in the port name since the background page won't be able to detect it on reception (it will see -1)
var port = browser.runtime.connect({name: JSON.stringify({name: "devtools", tabId: tabId})});

port.onMessage.addListener(function(message) {
    if (message && message.type && message.data) {
        if (message.type == "onInfo") {
            boomr = message.data;
            refreshInfo();
        }
        else if (message.type === "onConfig") {
            config = message.data;
            refreshConfig();
        }
        else if (message.type === "onBeacon") {
            message.data.isBeacon = true;
            message.data.type = "Beacon";
            addBeacon(message.data);
            refreshEvents();
        }
        else if (message.type === "onHistoryStateUpdated") {
            if (message.data.frameId === 0) {  // only show top window activity for now
                message.data.isHistory = true;
                message.data.type = "History";
                events.push(message.data);
                refreshEvents();
            }
        }
        else if (message.type === "onUpdated") {
            message.data.isUpdate = true;
            message.data.type = "URL Update";
            events.push(message.data);
            refreshEvents();
        }
        else if (message.type === "onNavigationCommited") {
            if (message.data.frameId === 0) {  // only show top window activity for now
                boomr = undefined;
                config = undefined;
                events = [];
                message.data.isNavigation = true;
                message.data.type = "Navigation";
                events.push(message.data);

                refreshInfo();
                refreshConfig();
                refreshEvents();
            }
        }
        else if (message.type === "onBeforeRequest") {
            message.data.isRequest = true;
            //events.push(message.data);
            //refreshEvents();
        }
        else if (message.type === "onResponseStarted") {
            message.data.isRequest = true;
            //events.push(message.data);
            //refreshEvents();
        }
        else if (message.type === "onCompleted") {
            message.data.isRequest = true;
            //events.push(message.data);
            //refreshEvents();
        }
        else if (message.type === "onEvent") {
            switch(message.data.type) {
                case "override":
                    message.data.isOverride = true;
                    message.data.type = "Override";
                    break;
                case "call":
                    message.data.isCall = true;
                    message.data.type = "Call";
                    break;
                case "event":
                    message.data.isEvent = true;
                    message.data.type = "Event";
                    break;
                case "boomrevent":
                    message.data.isEvent = true;
                    message.data.type = "BOOMR Event";
                    break;
                default:
                    break;
            }
            events.push(message.data);
            refreshEvents();
        }
    }
});

window.addEventListener("load", function() {
    sandboxIframe = document.getElementById("sandbox-iframe");
    var message = {
        command: "compile",
        name: "template-content-events",
        source: document.getElementById("template-content-events").innerHTML
    };
    sandboxIframe.contentWindow.postMessage(message, "*");

    message = {
        command: "compile",
        name: "template-content-config",
        source: document.getElementById("template-content-config").innerHTML
    };
    sandboxIframe.contentWindow.postMessage(message, "*");

    refreshEvents();
});

window.addEventListener("message", function(event) {
    if (event.data && event.data.name && event.data.target && event.data.html) {
        document.getElementById(event.data.target).innerHTML = event.data.html;

        var toggler = document.getElementsByClassName("caret");
        var i;

        for (i = 0; i < toggler.length; i++) {
            toggler[i].addEventListener("click", function() {
                this.parentElement.querySelector(".nested").classList.toggle("active");
                this.classList.toggle("caret-down");
            });
        }
    }
});
