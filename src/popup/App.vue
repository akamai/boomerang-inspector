<template>
  <div id="content">
    <template v-if="version">
      <table>
        <tr><td>Version</td><td>{{version || "-"}}</td></tr>
        <tr><td>Injection</td><td>{{injection || "-"}}</td></tr>
        <tr><td>Loader Version</td><td>{{loaderVersion || "-"}}</td></tr>
        <template v-if="isMPulse">
          <tr><td>Page Group</td><td>{{ pageGroup }}</td></tr>
          <tr><td>API Key</td><td>{{apikey || "-"}}</td></tr>
          <tr v-if="hasConfig"><td>Domain</td><td>{{this.domain || "-"}}</td></tr>
          <tr><td>Config Received</td><td>{{hasConfig? "Yes" : "No"}}</td></tr>
          <tr><td>Overrides</td><td>{{hasOverrides? "Yes" : "No"}}</td></tr>
          <tr><td>Rate Limited</td><td :class="{'bold-red': isRateLimited}">{{isRateLimited ? "Yes" : "No"}}</td></tr>
          <tr><td>Session ID</td><td>{{session.ID || "-"}}</td></tr>
          <tr><td>Session Length</td><td>{{session.length || "-"}}</td></tr>
          <tr><td>Session Start</td><td>{{sessionStartTime || "-"}}</td></tr>
        </template>
      </table>
    </template>
    <template v-else>
      Boomerang not detected
    </template>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    return {
      version: "",
      apikey: "",
      domain: "",
      injection: "",
      loaderVersion: "",
      pageGroup: "",
      overrides: {},
      session: {},
      config: {},
      isMPulse: false
    }
  },

  computed: {
      hasConfig() {
          return Object.keys(this.config).length !== 0;
      },
      hasOverrides() {
          return Object.keys(this.overrides).length !== 0;
      },
      sessionStartTime() {
          return this.session.start ? new Date(this.session.start) : undefined;
      },
      isRateLimited() {
          return this.session.rate_limited;
      }
  },

  mounted() {
    var browser = browser || chrome;
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      browser.runtime.sendMessage({type: "getInfo", tabId: tabs[0].id}, (data) => {
        let version;
        if (data && data.boomr) {
            let params = data.boomr.params;
            version = params.version || "-";
            version = params.vendor ? version + " (" + params.vendor + ")" : version;
            this.version = version;
            this.loaderVersion = params.loaderVersion;
            if (params.vendor === "Akamai mPulse") {
                this.isMPulse = true;
                this.apikey = params.apikey;
                this.domain = data.domain;
                this.injection = params.injection;
                this.overrides = params.BOOMR_config || {};
                this.config = data.config || {};
                this.pageGroup = data.pageGroup || "No page group";
            }
            this.session = data.session || {};
        }
      });
    });
  },
});
</script>

<style scoped>
#content {
  margin: 10px;
  white-space: nowrap;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
}
td.bold-red {
    color: rgb(212, 33, 33);
    font-weight: bold;
}
</style>
