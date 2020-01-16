"use strict";

var browser = browser || chrome;

// create our Boomerang devtools panel
browser.devtools.panels.create("Boomerang",
    "/icons/boomr-32x32.png",
    "/devtools/devtools-panel.html");
