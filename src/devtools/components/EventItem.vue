<template>
  <td>
    {{event.params}}
  </td>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    event: {
        type: Object,
        required: true
    }
  },
});
</script>