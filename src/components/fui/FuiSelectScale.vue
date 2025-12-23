<script lang="ts" setup>
import {ref, toRefs, watch, onMounted, onUnmounted, nextTick} from 'vue';
import Icon from '/src/components/layout/Icon.vue';
import {useSession} from '../../core/session';

const MIN_ZOOM = 10;
const MAX_ZOOM = 2000;
const ZOOM_STEP = 25;

const session = useSession();
const {scale} = toRefs(session.state);
// Local numeric value for the input
const currentScale = ref(Math.round(scale.value.x * 100));

watch(scale, (newScale) => {
    // Update local value when state changes (e.g. valid input or external change)
    const val = Math.round(newScale.x * 100);
    if (val !== currentScale.value) {
        currentScale.value = val;
    }
}, {deep: true});

function updateScale(val: number) {
    let newScale = Math.min(Math.max(val, MIN_ZOOM), MAX_ZOOM);
    session.setScale(newScale, true);
    currentScale.value = newScale;
}

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey) {
        if (event.key === '=' || event.key === '+') { // Handle + key
            event.preventDefault();
            scaleUp();
        }
        if (event.key === '-') {
            event.preventDefault();
            scaleDown();
        }
    }
};

function scaleDown() {
    // Find next lower step
    let next = Math.floor(currentScale.value / ZOOM_STEP) * ZOOM_STEP;
    if (next >= currentScale.value) next -= ZOOM_STEP;
    updateScale(next);
}

function scaleUp() {
    // Find next upper step
    let next = Math.ceil(currentScale.value / ZOOM_STEP) * ZOOM_STEP;
    if (next <= currentScale.value) next += ZOOM_STEP;
    updateScale(next);
}

function validateInput(e: Event) {
    const target = e.target as HTMLInputElement;
    let val = parseInt(target.value);
    if (isNaN(val)) val = 100;
    updateScale(val);
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>
<template>
    <div class="flex flex-row items-center mr-16 gap-1">
        <button
            class="btn btn-ghost btn-xs btn-square"
            @click="scaleDown"
            title="Zoom Out (Ctrl -)"
        >
            <Icon type="zoom-out" sm />
        </button>
        
        <div class="join items-center bg-base-100 rounded border border-base-300 px-2 h-8">
            <input
                type="number"
                class="input input-ghost input-xs w-16 p-0 text-right no-spinners"
                v-model.number="currentScale"
                @change="validateInput"
                :min="MIN_ZOOM"
                :max="MAX_ZOOM"
            />
            <span class="text-xs opacity-50 ml-1">%</span>
        </div>

        <button
            class="btn btn-ghost btn-xs btn-square"
            @click="scaleUp"
            title="Zoom In (Ctrl +)"
        >
            <Icon type="zoom-in" sm />
        </button>
    </div>
</template>
<style lang="css"></style>
