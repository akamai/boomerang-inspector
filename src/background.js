var browser = browser || chrome;

function refresh(tabId, beaconCount) {
    //
    if (typeof beaconCount === "number") {
        browser.browserAction.enable(tabId);
        setBadge(beaconCount > 0 ? "" + beaconCount : "", tabId);
    }
    else {
        browser.tabs.sendMessage(tabId, {type: "getBeaconCount"}, function(response) {
            setBadge(response.beaconCount > 0 ? "" + response.beaconCount : "", tabId);
        });
    }
};

function setBadge(text, tabId) {
    browser.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255], tabId: tabId});
    browser.browserAction.setBadgeText({text: text, tabId: tabId});
};

browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message && message.type && sender && sender.tab && sender.tab.id) {
        switch (message.type) {
            case "boomr":
                browser.browserAction.enable(sender.tab.id);
                break;
            case "config":
                break;
            case "beacon":
                refresh(sender.tab.id, message.beaconCount);
                break;
            default:
                break;
        }
    }
});

// tab activated
browser.tabs.onActivated.addListener(function(activeInfo) {
    browser.tabs.sendMessage(activeInfo.tabId, {type: "getInfo"}, function(data) {
        if (data) {
            refresh(activeInfo.tabId);
        }
        else {
          browser.browserAction.setBadgeText({text: ""});
          browser.browserAction.disable(activeInfo.tabId);
        }
    });
});

// tab updated
browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    browser.tabs.sendMessage(tabId, {type: "getInfo"}, function(data) {
        if (data) {
            refresh(tabId);
        }
        else {
            browser.browserAction.setBadgeText({text: ""});
            browser.browserAction.disable(tabId);
        }
    });
});

// chrome.webRequest.onCompleted.addListener(function(info) {
// });

// chrome.webRequest.onBeforeRequest.addListener(function(info) {
// });

(function init() {
    browser.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
    browser.browserAction.setBadgeText({text: ""});
    browser.browserAction.disable();
})();
