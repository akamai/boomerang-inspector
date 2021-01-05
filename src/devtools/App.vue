<template>
  <div>
    <div>
      <table>
        <tr><td>Version</td><td>{{version}}</td></tr>
        <tr><td>Akamai mPulse API Key</td><td>{{apikey}}</td></tr>
        <tr><td>Session ID</td><td>{{session.ID || "-"}}</td></tr>
        <tr><td>Session Length</td><td>{{session.length || "-"}}</td></tr>
        <tr><td>Session Start</td><td>{{sessionStartTime || "-"}}</td></tr>
      </table>
    </div>
    <div class="tabs">
      <div class="tab">
        <input type="radio" id="tab-events" name="tabs" checked>
        <label for="tab-events">Events</label>
        <div id="content-events" class="content">
          <EventPanel v-bind:events="filteredEvents" @clearEvents="clearEvents"/>
        </div>
      </div>

      <div class="tab">
        <input type="radio" id="tab-config" name="tabs">
        <label for="tab-config">Config</label>
        <div id="content-config" class="content">
          <ConfigPanel v-bind:config="this.config" v-bind:overrides="this.overrides"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
"use strict";

import { getBeaconType } from './utils/beacon.js'

var browser = browser || chrome;

import EventPanel from './components/EventPanel';
import ConfigPanel from './components/ConfigPanel';

var eventId = 0;

export default {
  name: 'app',
  data() {
    return {
      version: undefined,
      apikey: undefined,
      config: undefined,
      overrides: undefined,
      session: {},
      events: []
    }
  },
  computed: {
      filteredEvents() {
          return this.events;
      },
      sessionStartTime() {
          return this.session.start ? new Date(this.session.start) : undefined;
      }
  },
  components: {
      EventPanel,
      ConfigPanel
  },
  methods: {
      clearEvents() {
          this.events = [];
      }
  },
  mounted() {
      if (browser) {
        const tabId = browser.devtools.inspectedWindow.tabId;
        browser.runtime.sendMessage({type: "getInfo", tabId: tabId}, (results) => {
            if (results && results.params) {
                this.version = results.params.version;
                this.apikey = results.params.apikey;
                this.overrides = results.params.BOOMR_config;
            }
        });

        // connection to background script.
        // Send the inspected tabId in the port name since the background page won't be able to detect it on reception (it will see -1)
        const port = browser.runtime.connect({name: JSON.stringify({name: "devtools", tabId: tabId})});

        port.onMessage.addListener((message) => {
            if (message && message.type && message.data) {
                if (message.type === "onInfo") {
                    this.version = message.data.params.version;
                    this.apikey = message.data.params.apikey;
                    this.overrides = message.data.params.BOOMR_config;
                }
                else if (message.type === "onConfig") {
                    this.config = message.data.params;
                }
                else if (message.type === "onSession") {
                    this.session = message.data.params.session;

                    const event = message.data;
                    event.id = eventId++;
                    event.component = "EventItem";
                    this.events.push(event);
                }
                else if (message.type === "onNavigationCommited") {
                    if (message.data.frameId === 0) {  // only show top window activity for now
                        this.version = undefined;
                        this.apikey = undefined;
                        this.overrides = undefined;
                        this.config = undefined;
                        this.clearEvents();

                        const event = {};
                        event.id = eventId++;
                        event.component = "EventItem";
                        event.type = "navigation-commited";
                        event.params = message.data;
                        this.events.push(event);
                    }
                }
                else if (message.type === "onCookieChanged") {
                    const event = {};
                    event.id = eventId++;
                    event.component = "EventItem";
                    event.type = "cookie-changed";
                    event.params = message.data;
                    this.events.push(event);
                }
                else if (message.type === "onBeacon") {
                    const event = message.data
                    event.id = eventId++;
                    const COLUMNS = [
                        "pid",
                        "n",
                        "beacon_type",
                        "page_group",
                        "u",
                        "rt.tstart",
                        "rt.end",
                        "t_resp",
                        "t_page",
                        "t_done",
                        "rt.sl"
                    ];
                    event.columns = COLUMNS;
                    event.params.beacon_type = getBeaconType(event.params);
                    event.params.page_group = event.params["xhr.pg"] || event.params["h.pg"];
                    event.component = "BeaconItem";
                    this.events.push(event);
                }

                else if (message.type === "onHistoryStateUpdated") {
                    if (message.data.frameId === 0) {  // only show top window activity for now
                        const event = {};
                        event.id = eventId++;
                        event.component = "EventItem";
                        event.type = "history-updated";
                        event.params = message.data;
                        this.events.push(event);
                    }
                }
                else if (message.type === "onUpdated") {
                    const event = {};
                    event.id = eventId++;
                    event.component = "EventItem";
                    event.type = "tab-updated";
                    event.params = message.data;
                    this.events.push(event);
                }

                else if (message.type === "onBeforeRequest") {
                    //
                    if (message.data.frameId === 0) {  // only show top window activity for now
                        //console.log("Inspector: Request queued: " + JSON.stringify(message.data));

                        const event = {};
                        event.id = eventId++;
                        event.component = "EventItem";
                        event.type = "request-queued";
                        event.params = message.data;
                        this.events.push(event);
                    }
                }
                else if (message.type === "onResponseStarted") {
                    //
                    if (message.data.frameId === 0) {  // only show top window activity for now
                        //console.log("Inspector: Response started: " + JSON.stringify(message.data));

                        const event = {};
                        event.id = eventId++;
                        event.component = "EventItem";
                        event.type = "response-started";
                        event.params = message.data;
                        this.events.push(event);
                    }
                }
                else if (message.type === "onCompleted") {
                    //
                    if (message.data.frameId === 0) {  // only show top window activity for now
                        //console.log("Inspector: Request completed: " + JSON.stringify(message.data));

                        const event = {};
                        event.id = eventId++;
                        event.component = "EventItem";
                        event.type = "request-completed";
                        event.params = message.data;
                        this.events.push(event);
                    }
                }
                else if (message.type === "onEvent") {
                    // let type = "event";
                    // switch(message.data.type) {
                    //     case "override":
                    //         type = "Override";
                    //         break;
                    //     case "call":
                    //         type = "Call";
                    //         break;
                    //     case "event":
                    //         type = "Event";
                    //         break;
                    //     case "boomrevent":
                    //         type = "BOOMR Event";
                    //         break;
                    //     default:
                    //         break;
                    // }
                    const event = message.data;
                    event.id = eventId++;
                    event.component = "EventItem";
                    this.events.push(event);
                }
            }
        });
      }
  }
}
</script>

<style scoped>
    /*https://stackoverflow.com/questions/24765863/css-tabs-expand-height-to-content*/
    .tabs {
    position: relative;
    min-height: 100px;
    clear: both;
    margin: 25px 0;
    }
    .tab {
    float: left;
    }
    .tab label {
    background: #eee;
    padding: 10px;
    border: 1px solid #ccc;
    margin-left: -1px;
    position: relative;
    left: 1px;
    }
    .tab [type=radio] {
    display: none;
    }
    .content {
    position: absolute;
    top: 28px;
    left: 0;
    background: white;
    /*padding: 20px;*/
    border: 1px solid #ccc;
    display:none;
    min-width:700px;
    width: 100%;
    }
    [type=radio]:checked ~ label {
    background: white;
    border-bottom: 1px solid white;
    z-index: 2;
    }
    [type=radio]:checked ~ label ~ .content {
    display:block;
    }



    .active {
    display: block;
    }

    span.nativeoverride {
    color: #df6623;
    }

    span.methodcall {
    color: #be73d2;
    }
</style>