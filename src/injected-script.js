function load() {
    var message;

    // send content-script basic boomerang info
    message = {
        type: "boomr",
        data: {
            version: BOOMR.version,
            apikey: window.BOOMR_API_key,
            url: BOOMR.url,
            config_url: BOOMR.config_url
        }
    };
    window.postMessage(message, "*");

    // config event
    BOOMR.subscribe("onconfig", function(config) {
        var message = {type: "config", data: config};
        window.postMessage(message, "*");
    });

    // beacon event
    BOOMR.subscribe("onbeacon", function(beacon) {
        var message = {type: "beacon", data: beacon};
        window.postMessage(message, "*");
    });
}

if (window.BOOMR && typeof BOOMR.subscribe === "function") {
    load();
}
else if (document.addEventListener) {
      document.addEventListener("onBoomerangLoaded", load);
}
else if (document.attachEvent) {
    document.attachEvent("onpropertychange", function(e) {
        e = e || window.event;
        if (e && e.propertyName === "onBoomerangLoaded") {
            load();
        }
    });
}
