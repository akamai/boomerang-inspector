var browser = browser || chrome;

var info = {
  boomr: {},
  beacons:[]
};

// messages from injected script
window.addEventListener("message", function(event) {
    if (event && event.source && /*event.source === window &&*/ event.data && event.data.type) {
        switch (event.data.type) {
            case "boomr":
                info.boomr = event.data.data;
                browser.runtime.sendMessage({type: "boomr"});
                break;
            case "config":
                info.config = event.data.data;
                // notify background page
                browser.runtime.sendMessage({type: "config"});
                break;
            case "beacon":
                info.beacons.push(event.data.data);
                // notify background page
                browser.runtime.sendMessage({type: "beacon", beaconCount: info.beacons.length});
                break;
            default:
                console.log("unknown message " + event.data.type);
                break;
        }
    }
});

// messages from background or popup
browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    switch (message.type) {
        case "getInfo":
            sendResponse(info.boomr);
            break;
        case "getBeaconCount":
            sendResponse({beaconCount: info.beacons.length});
            break;
        default:
            break;
    }
});

// inject script into base page
var s = document.createElement("script");
var filename = browser.extension.getURL("src/injected-script.js");
//debugger;
s.src = filename;
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);
