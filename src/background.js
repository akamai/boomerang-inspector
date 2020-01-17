"use strict";

var browser = browser || chrome;

var tabsData = {};  // hashed by tabId
var portsFromDevtools = {};  // hashed by inspected window tabId

var BI_enabled = true;

var BI_DEFAULT_OPTIONS = {
    monitorNatives: false,
    monitorHistory: false,
    monitorCookies: false
};

var BI_options = BI_DEFAULT_OPTIONS;

/**
 * refreshes the browser action icon
 */
function refreshBadge(tabId) { 
    const tabData = tabsData[tabId];
    let beaconCount, suffix = "";

    if (tabData && tabData.session && tabData.session.rate_limited) {
        browser.browserAction.setBadgeBackgroundColor({color: "#cc3333", tabId: tabId});
        browser.browserAction.setBadgeText({text: "RL", tabId: tabId});
    }
    else if (tabData && tabData.boomr) {
        beaconCount = tabData.beaconCount;
        browser.browserAction.setBadgeBackgroundColor({color: "#33cc33", tabId: tabId});
        browser.browserAction.setBadgeText({text: "" + beaconCount, tabId: tabId});
    }
    else {
        browser.browserAction.setBadgeText({text: ""});
        suffix = "-gray";
    }

    browser.browserAction.setIcon({
        path: {
            "128": `icons/boomr-128x128${suffix}.png`,
            "48": `icons/boomr-48x48${suffix}.png`,
            "32": `icons/boomr-32x32${suffix}.png`,
            "20": `icons/boomr-20x20${suffix}.png`
        }
    });
    browser.browserAction.enable(tabId);
}

/**
 * Listen for messages from popup or devtools
 */
browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // check tabId in message first since sender tabId will be -1 when the event is from the devtools panel
    var tabId = (message && message.tabId) || (sender && sender.tab && sender.tab.id);
    if (message && message.type && tabId) {
        switch (message.type) {
            case "getInfo":  // from popup or devtools
                if (tabsData[tabId]) {
                    sendResponse(tabsData[tabId]);
                }
                else {
                    sendResponse({"error": "tab not found"});
                }
                break;
            default:
                break;
        }
    }
});

/**
 * Listen for connections from content-script and devtools
 */
browser.runtime.onConnect.addListener(function connected(port) {
    var connInfo, tabId, data;
    try {
        connInfo = JSON.parse(port.name);
    }
    catch(e) {
        console.error("onConnect failed:" + e);
        return;
    }

    if (!connInfo) {
        return;
    }

    // connection from content-script
    if (connInfo.name === "content-script") {
        tabId = port.sender.tab.id;
        // forward messages from content-script to devtools
        port.onMessage.addListener(function(message) {
            if (message && message.type && tabId) {
                data = message.data;
                switch (message.type) {
                    case "onInfo":  // from content script
                        tabsData[tabId].boomr = data;
                        refreshBadge(tabId);
                        if (portsFromDevtools[tabId]) {
                            portsFromDevtools[tabId].postMessage(message);
                        }
                        break;
                    case "onConfig":  // from content script
                        // TODO refresh browseraction (eg. rate limited flag)
                        tabsData[tabId].config = data.params;
                        if (portsFromDevtools[tabId]) {
                            portsFromDevtools[tabId].postMessage(message);
                        }
                        break;
                    case "onSession":  // from content script
                        tabsData[tabId].session = data.params.session;
                        if (data.params.session.rate_limited) {
                            refreshBadge(tabId);
                        }
                        if (portsFromDevtools[tabId]) {
                            portsFromDevtools[tabId].postMessage(message);
                        }
                        break;
                    case "onBeacon":  // from content script
                        tabsData[tabId].beaconCount++;
                        refreshBadge(tabId);
                        if (portsFromDevtools[tabId]) {
                            portsFromDevtools[tabId].postMessage(message);
                        }
                        break;
                    case "onEvent":
                        if (data.type === "domain") {
                            tabsData[tabId].domain = data.params.domain;
                        }
                        if (portsFromDevtools[tabId]) {
                            portsFromDevtools[tabId].postMessage(message);
                        }
                        break;
                    default:
                        break;
                }
            }
        });
    }
    // connection from devtools
    else if (connInfo.name === "devtools") {
        tabId = connInfo.tabId;

        if (typeof tabId === "undefined") {
            return;
        }
        portsFromDevtools[tabId] = port;

        port.onDisconnect.addListener(function() {
            delete portsFromDevtools[tabId];
        });

        // use the background script to listen to network events.
        // The devtools panel can listen for chrome.devtools.network.onRequestFinished but can't get notified when a request is starting.

        // needs `webRequest` permission
        // See https://developer.chrome.com/extensions/webRequest#event-onBeforeRequest
        // See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
        browser.webRequest.onBeforeRequest.addListener(
            function(details) {
                /* eg.
                frameId: 1014
                initiator: "https://www.example.com"
                method: "GET"
                parentFrameId: 0
                requestId: "23615"
                tabId: 355
                timeStamp: 1543589511128.228
                type: "script"
                url: "https://c.go-mpulse.net/boomerang/APIKEY"
                */
                if (details && details.tabId >= 0) {
                    if (portsFromDevtools[details.tabId]) {
                        portsFromDevtools[details.tabId].postMessage({type: "onBeforeRequest", data: details});
                    }
                }
            },
            {"urls": ["<all_urls>"], tabId: tabId}
        );

        // needs `webRequest` permission
        // See https://developer.chrome.com/extensions/webRequest#event-onResponseStarted
        // See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onResponseStarted
        browser.webRequest.onResponseStarted.addListener(
            function(details) {
                /* eg.
                frameId: 1012
                fromCache: false
                initiator: "https://www.example.com"
                ip: "127.0.0.1"
                method: "GET"
                parentFrameId: 0
                requestId: "23595"
                statusCode: 200
                statusLine: "HTTP/1.1 200 OK"
                tabId: 355
                timeStamp: 1543589510352.553
                type: "script"
                url: "https://c.go-mpulse.net/boomerang/APIKEY"
                */
                if (details && details.tabId >= 0) {
                    if (portsFromDevtools[details.tabId]) {
                        portsFromDevtools[details.tabId].postMessage({type: "onResponseStarted", data: details});
                    }
                }
            },
            {"urls": ["<all_urls>"], tabId: tabId}
        );

        // needs `webRequest` permission
        // See https://developer.chrome.com/extensions/webRequest#event-onCompleted
        // See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onCompleted
        browser.webRequest.onCompleted.addListener(
            function(details) {
                /* eg.
                frameId: 1014
                fromCache: false
                initiator: "https://www.example.com"
                ip: "127.0.0.1"
                method: "GET"
                parentFrameId: 0
                requestId: "23615"
                statusCode: 200
                statusLine: "HTTP/1.1 200 OK"
                tabId: 355
                timeStamp: 1543589512116.266
                type: "script"
                url: "https://c.go-mpulse.net/boomerang/APIKEY"
                */
                if (details && details.tabId >= 0) {
                    if (portsFromDevtools[details.tabId]) {
                        portsFromDevtools[details.tabId].postMessage({type: "onCompleted", data: details});
                    }
                }
            },
            {"urls": ["<all_urls>"], tabId: tabId}
        );
    }
});

/**
 * Tab activated
 * 
 * needs `tabs` permission
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onActivated
 * https://developer.chrome.com/extensions/tabs#event-onActivated 
*/
browser.tabs.onActivated.addListener(function(activeInfo) {
    refreshBadge(activeInfo.tabId);
});

/**
 * Tab updated
 * 
 * needs `tabs` permission
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated
 * https://developer.chrome.com/extensions/tabs#event-onUpdated
 */
browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var now = performance.now();
    //console.log("onUpdated: " + JSON.stringify(changeInfo));
    if (tabId >= 0 && changeInfo && changeInfo.url) {
        if (portsFromDevtools[tabId]) {
            changeInfo.timeStamp = now;
            portsFromDevtools[tabId].postMessage({type: "onUpdated", data: changeInfo});
        }
    }
});

// // tab replaced
// browser.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
//     delete tabsData[removedTabId];
// });
//
// // tab removed
// browser.tabs.onRemoved.addListener(function(tabId, removeInfo) {
//     delete tabsData[tabId];
// });

/**
 * Listen for navigations
 * 
 * needs `webNavigation` permission
 * See https://developer.chrome.com/extensions/webNavigation#event-onCommitted
 * See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onCommitted
 */
browser.webNavigation.onCommitted.addListener(function(details) {
    if (!BI_enabled) {
        return;
    }

    if (details && details.tabId >= 0) {
        if (details.frameId === 0) {
            tabsData[details.tabId] = {beaconCount: 0};  // reset
            
            // send options to web page then inject the script
            chrome.tabs.executeScript(details.tabId, {
                frameId: 0,
                code: "var options = '" + JSON.stringify(BI_options) + "';",
                runAt: "document_start",
                allFrames: false
            }, () => {
                chrome.tabs.executeScript(details.tabId, {
                    frameId: 0,
                    file: "content-script.js",
                    runAt: "document_start",
                    allFrames: false
                });
            });

            refreshBadge(details.tabId);
        }
        if (portsFromDevtools[details.tabId]) {
            portsFromDevtools[details.tabId].postMessage({type: "onNavigationCommited", data: details});
        }
    }
});

/**
 * Send History changes to devtools
 * 
 * needs `webNavigation` permission
 * See https://developer.chrome.com/extensions/webNavigation#event-onHistoryStateUpdated
 * See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onHistoryStateUpdated
 */
browser.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    if (details && details.tabId >= 0 && details.frameId === 0) {  // don't report frame activity for now
        if (portsFromDevtools[details.tabId]) {
            portsFromDevtools[details.tabId].postMessage({type: "onHistoryStateUpdated", data: details});
        }
    }
});

/**
 * Listen for options changes
*/
browser.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === "local") {
        for (var key in changes) {
            let storageChange = changes[key];
            BI_options[key] = storageChange.newValue;
        }
    }
});

(function init() {
    refreshBadge();

    browser.storage.local.get(BI_DEFAULT_OPTIONS, (res) => {
        BI_options = res;
    });
})();
