function load() {
    var message, apikey;

    // mPulse specific
    apikey = window.BOOMR_API_key;
    if (!apikey && BOOMR.url) {
      var m = /\/boomerang\/([A-Z0-9-]{29})/.exec(BOOMR.url);
      if (m && m.length >= 2) {
        apikey = m[1];
      }
    }

    // send basic boomerang and mPulse info to content-script
    message = {
        type: "boomr",
        data: {
            version: BOOMR.version,

            // mPulse specific
            apikey: apikey,
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

(function init() {
    if (window.BOOMR && typeof BOOMR.subscribe === "function") {
        load();
    }
    else if (document.addEventListener) {
        document.addEventListener("onBoomerangLoaded", load);
    }
})();
