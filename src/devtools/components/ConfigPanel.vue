<template>
  <div>
      Overrides:
      <pre>{{formattedOverrides}}</pre>
      Config:
      <pre>{{formattedConfig}}</pre>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    overrides: {
        type: Object,
        required: true
    },
    config: {
      type: Object,
      required: true
    }
  },

  computed: {
    formattedOverrides(){
      return JSON.stringify(this.overrides, null, 4);
    },
    formattedConfig() {
      return JSON.stringify(this.config, null, 4);
    }
  },
});
</script>