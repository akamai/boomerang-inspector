<template>
  <td>
    <table>
        <thead>
            <tr>
                <th v-for="column in event.columns">{{column}}</th>
            </tr>
        </thead>
        <tbody>
            <td v-for="column in event.columns">{{event.params[column]}}</td>
        </tbody>
    </table>
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