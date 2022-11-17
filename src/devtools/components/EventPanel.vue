<template>
    <table>
      <thead>
        <tr><td><button @click="$emit('clearEvents')">Clear Events</button></td></tr>
        <tr>
          <th>TimeStamp</th>
          <th>Type</th>
          <th>Stack</th>
          <th>Component</th>
        </tr>
      </thead>
      <tfoot>
        <tr><td><button @click="$emit('clearEvents')">Clear Events</button></td></tr>
      </tfoot>
      <tbody>
          <tr v-for="event in events" v-bind:key="event.id">
            <td>
              {{event.timestamp}}
            </td>
            <td>
              {{event.type}}
            </td>
            <td>
              <StackComponent v-bind:stack="event.stack"></StackComponent>
            </td>
            <td>
              <component :is="event.component" v-bind:event="event"></component>
            </td>
          </tr>
      </tbody>
    </table>
</template>

<style scoped>
    table {
    color: #333;
    font-family: Helvetica, Arial, sans-serif;
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
    }
    th {
    background: #F3F3F3;
    font-weight: bold;
    text-align: left;
    }
    td {
    border: 1px solid #eee;
    }
    tr:nth-child(even) {
    background: #f5f5f5
    }
    tr:nth-child(odd) {
    background: #fff
    }
</style>

<script>
import StackComponent from './StackComponent';
import BeaconItem from './BeaconItem';
import EventItem from './EventItem';

export default {
  props: {
    events: {
        type: Array,
        required: true
    }
  },
  components: {
    StackComponent,
    BeaconItem,
    EventItem
  }
}
</script>