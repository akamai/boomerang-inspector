"use strict";

var browser = browser || chrome;

// See https://developer.chrome.com/extensions/options

function save_options() {
    var preserveLog = document.getElementById("preserveLog").checked;
    browser.storage.sync.set({
        preserveLog: preserveLog
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById("status");
        status.textContent = "Options saved.";
        setTimeout(function() {
            status.textContent = "";
        }, 750);
    });
}

function restore_options() {
    browser.storage.sync.get({
        preserveLog: false
    }, function(items) {
        document.getElementById("preserveLog").checked = items.preserveLog;
    });
}

document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", save_options);
