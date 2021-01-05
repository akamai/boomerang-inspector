# Boomerang Inspector Browser Extension

## Summary

Provides a browser extension for quickly viewing information about the [Boomerang](https://github.com/akamai/boomerang/) library running on a page.

<img src="img/popup1.png" alt="popup" width="400"/>

Also provides a devtools tab for viewing/debugging various Boomerang and page events (native overrides, network requests, History events, Boomerang beacons, etc.).

<img src="img/devtools1.png" alt="devtools" width="400"/>


## Building
```
$ npm install
$ npm run-script build
```

## Loading

To install the extension, you'll need to point your browser to the `dist` sub-directory.  Instructions for each browser:

### Chrome
https://developer.chrome.com/extensions/getstarted#unpacked

- Navigate to chrome://extensions/
- "Developer mode" checkbox
- "Load unpacked extension..." button

### Firefox
https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox

- Navigate to about:debugging
- "Enable add-on debugging" checkbox
- "Load temporary Add-on" button

### Edge
https://docs.microsoft.com/en-us/microsoft-edge/extensions/guides/adding-and-removing-extensions

- Navigate to about:flags
- "Enable extension developer features"
- Goto Extensions in the menu
- "Load extension" button
- In the extension settings, turn it on and enable "Show button next to address bar"

### Opera
https://dev.opera.com/extensions/testing/

- Navigate to opera://extensions/
- "Developer mode" checkbox
- "Load unpacked extension..." button
