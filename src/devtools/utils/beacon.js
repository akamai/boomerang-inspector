export function getBeaconType(beacon) {
    var type = "unknown";
    if (beacon["http.initiator"]) {
        if (["spa_hard", "spa"].indexOf(beacon["http.initiator"]) !== -1) {
            type = beacon["http.initiator"];
            if (typeof beacon["rt.abld"]  !== "undefined" || typeof beacon["rt.quit"] !== "undefined") {
                type += " (aborted)";
            }
        }
        else if (["xhr", "error", "click", "error", "interaction", "api_custom_timer", "api_custom_metric", "amp"].indexOf(beacon["http.initiator"]) !== -1) {
            type = beacon["http.initiator"];
        }
    }
    else {
        if (typeof beacon["rt.quit"] !== "undefined") {
            type = "unload";
        }
        else if (["navigation", "none", "cookie", "csi", "gtb"].indexOf(beacon["rt.start"]) !== -1) {
            type = "page_view (" + beacon["rt.start"] + ")";
        }
    }
    if (typeof beacon["early"]  !== "undefined") {
        type += " (early)";
    }
    return type;
}
