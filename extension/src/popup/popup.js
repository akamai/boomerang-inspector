var browser = browser || chrome;

browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    browser.runtime.sendMessage({type: "getInfo", tabId: tabs[0].id}, function(data) {
        var version;
        if (data) {
            data.version = data.version || "-";
            version = data.vendor ? data.version + " (" + data.vendor + ")" : data.version;
            document.getElementById("version").innerHTML = version;
            if (data.vendor === "Akamai mPulse") {
                document.getElementById("apikey").innerHTML = data.apikey || "Unknown";
                document.getElementById("injection").innerHTML = data.injection || "Unknown";
                document.getElementById("overrides").innerHTML = data.BOOMR_config ? "Yes" : "No";
            }
        }
    });
});
