var browser = browser || chrome;

browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    browser.tabs.sendMessage(tabs[0].id, {type: "getInfo"}, function(data) {
        if (data) {
            document.getElementById("version").innerHTML = data.version;
            document.getElementById("apikey").innerHTML = data.apikey;
        }
    });
});
