<template>
  <td>
    {{event.params}}
  </td>
</template>

<script>
export default {
  props: {
    event: {
        type: Object,
        required: true
    }
  }
}
</script>