<template>
    <div v-if="stack">
        <ul class="stack">
            <li>
                <span class="caret" :class="{'caret-down': !nested}" @click="nested=!nested">{{cleanStack[0]}}</span>
                <ul class="stack" v-for="line in cleanStack.slice(1)" v-show="!nested">
                    <li>{{line}}</li>
                </ul>
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    data() {
        return {
            nested: true
        }
    },
    props: {
        method: "method",
        // method: {
        //   type: String,
        //   required: true
        // },
        stack: ""
        // {
        //   type: Object,
        //   required: true
        // },
    },
    computed:
    {
        cleanStack() {
            let stack = (this.stack || "");
            //stack = stack.replace(/(https?:\/\/.*:\d+:\d+)/, '<a href="$1" tabindex="-1">$1</a>');//'<span role="link" tabindex="-1">$1</span>');
            stack = stack.split("\n");
            if (!stack.length) {
                return [""];
            }
            if (stack[0] === "Error") {
                stack.shift();
            }
            if (!stack.length) {
                return [""];
            }
            if (/__bi_/.test(stack[0])) {
                stack.shift();
            }
            stack = stack.map(function(s) { return s.trim(); });
            
            return stack;
        },
    }
}
</script>

<style scoped>
    ul.stack, li.stack{
    margin: 0;
    padding: 0;
    list-style-type: none;
    }

    .caret {
    cursor: pointer;
    /*user-select: none;*/
    }

    .caret::before {
    content: "\25B6";
    color: #6c6c6c;
    display: inline-block;
    margin-right: 6px;
    }

    .caret-down::before {
    transform: rotate(90deg);
    }
</style>