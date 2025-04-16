<template>
    <div>
        <label>Monitor Natives (may break the page)</label><input type="checkbox" v-model="monitorNatives"><br>
        <label>Monitor History API (may break the page)</label><input type="checkbox" v-model="monitorHistory"><br>
        <label>Monitor Cookies</label><input type="checkbox" v-model="monitorCookies"><br>

        <div v-show="status">{{status}}</div><br>

        <button @click="save_options">Save</button>
    </div>
</template>

<script>
import { defineComponent } from 'vue';

var browser = browser || chrome;

// See https://developer.chrome.com/extensions/options

export default defineComponent({
  data() {
      return {
          monitorNatives: false,
          monitorHistory: false,
          monitorCookies: false,
          status: ""
      }
  },

  methods: {
      save_options() {
          const settings = {
              monitorNatives: this.monitorNatives,
              monitorHistory: this.monitorHistory,
              monitorCookies: this.monitorCookies
          };
          browser.storage.local.set(settings, () => {
              // Update status to let user know options were saved.
              this.status = "Options saved.";
              setTimeout(()=> {
                  this.status = "";
              }, 750);
          });
      },

      restore_options() {
          browser.storage.local.get({
              monitorNatives: this.monitorNatives,
              monitorHistory: this.monitorHistory,
              monitorCookies: this.monitorCookies
          }, (items) => {
              this.monitorNatives = items.monitorNatives;
              this.monitorHistory = items.monitorHistory;
              this.monitorCookies = items.monitorCookies;
          });
      }
  },

  mounted() {
      this.restore_options();
  },
});
</script>