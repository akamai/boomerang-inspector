"use strict";

var browser = browser || chrome;

var tabsData = {};  // hashed by tabId
var portsFromDevtools = {};  // hashed by inspected window tabId

/**
 * refreshes the browser action icon
 */
function refreshBadge(tabId) {
    var tabData = tabsData[tabId], beaconCount;
    if (tabData && tabData.boomr) {
        beaconCount = tabData.beaconCount;
        browser.browserAction.enable(tabId);
        browser.browserAction.setBadgeBackgroundColor({color: "#33cc33", tabId: tabId});
        browser.browserAction.setBadgeText({text: beaconCount > 0 ? "" + beaconCount : "", tabId: tabId});
    }
    else {
        browser.browserAction.setBadgeText({text: ""});
        browser.browserAction.disable(tabId);
    }
}

function cleanStack(stack) {
    stack = (stack || "").split("\n");
    if (!stack.length) {
        return [""];
    }
    if (stack[0] === "Error") {
        stack.shift();
    }
    if (!stack.length) {
        return [""];
    }
    if (/__bi_/.test(stack[0])) {
        stack.shift();
    }
    stack = stack.map(function(s) { return s.trim(); });
    return stack;
}

// listen for messages from content script and popup
browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // check tabId in message first since sender tabId will be -1 when the event is from the devtools panel
    var tabId = (message && message.tabId) || (sender && sender.tab && sender.tab.id);
    if (message && message.type && tabId) {
        switch (message.type) {
            case "getInfo":  // from popup or devtools
                if (tabsData[tabId] && tabsData[tabId].boomr) {
                    sendResponse(tabsData[tabId].boomr);
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

// listen for connections from content-script and devtools
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
                        tabsData[tabId].config = data;
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
                        if (portsFromDevtools[tabId]) {
                            message.data.stack = cleanStack(message.data.stack);
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

        // needs `webRequest` permission
        // See https://developer.chrome.com/extensions/webRequest#event-onBeforeRequest
        // See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
        browser.webRequest.onBeforeRequest.addListener(
            function(details) {
                /* eg.
                frameId: 1014
                initiator: "https://www.cvs.com"
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
                initiator: "https://www.cvs.com"
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
                initiator: "https://www.cvs.com"
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

// tab activated
// needs `tabs` permission
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onActivated
// https://developer.chrome.com/extensions/tabs#event-onActivated
browser.tabs.onActivated.addListener(function(activeInfo) {
    refreshBadge(activeInfo.tabId);
});

// tab updated
// needs `tabs` permission
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated
// https://developer.chrome.com/extensions/tabs#event-onUpdated
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

// needs `webNavigation` permission
// See https://developer.chrome.com/extensions/webNavigation#event-onCommitted
// See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onCommitted
browser.webNavigation.onCommitted.addListener(function(details) {
    if (details && details.tabId >= 0) {
        if (details.frameId === 0) {
            tabsData[details.tabId] = {beaconCount: 0};  // reset
            refreshBadge(details.tabId);
        }
        if (portsFromDevtools[details.tabId]) {
            portsFromDevtools[details.tabId].postMessage({type: "onNavigationCommited", data: details});
        }
    }
});

// needs `webNavigation` permission
// See https://developer.chrome.com/extensions/webNavigation#event-onHistoryStateUpdated
// See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onHistoryStateUpdated
browser.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    if (details && details.tabId >= 0 && details.frameId === 0) {  // don't report frame activity for now
        if (portsFromDevtools[details.tabId]) {
            portsFromDevtools[details.tabId].postMessage({type: "onHistoryStateUpdated", data: details});
        }
    }
});

(function init() {
    browser.browserAction.setBadgeBackgroundColor({color: "#33cc33"});
    browser.browserAction.setBadgeText({text: ""});
    browser.browserAction.disable();
})();
