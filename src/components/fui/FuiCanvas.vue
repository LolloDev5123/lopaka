<script lang="ts" setup>
import {computed, onBeforeUnmount, onMounted, ref, toRefs} from 'vue';
import {useSession} from '../../core/session';
import FuiGrid from './FuiGrid.vue';

const props = defineProps<{
    readonly?: Boolean;
}>();

const gridSize = computed(() => {
    return `${scale.value.x * pixelSize.value.x}px ${scale.value.y * pixelSize.value.y}px`;
});

const gridDisplay = computed(() => {
    return scale.value.x * pixelSize.value.x >= 3 ? 'block' : 'none';
});

const screen = ref(null);
const container = ref(null);
const session = useSession();
const {editor, virtualScreen, state} = session;
const {display, scale, pixelSize, lock, displaySettings} = toRefs(state);
const {activeTool} = toRefs(editor.state);

onMounted(() => {
    virtualScreen.setCanvas(screen.value);
    editor.setContainer(container.value as HTMLElement);
    document.addEventListener('mouseup', handleEvent);
    document.addEventListener('keydown', handleEvent);
});

onBeforeUnmount(() => {
    document.removeEventListener('mouseup', handleEvent);
    document.removeEventListener('keydown', handleEvent);
});

function handleEvent(e) {
    if (!props.readonly) {
        editor.handleEvent(e);
    }
}

function isSelectTool() {
    return !activeTool.value;
}

function isDrawingTool() {
    return activeTool.value;
}

const canvasClassNames = computed(() => {
    return {
        'fui-canvas_select': isSelectTool(),
        'fui-canvas_draw': isDrawingTool(),
    };
});
</script>
<template>
    <div
        class="canvas-wrapper"
        :class="{locked: lock}"
        :style="{
            backgroundColor: displaySettings.backgroundColor
        }"
    >
        <div class="fui-grid">
            <div
                ref="container"
                class="relative"
                :class="canvasClassNames"
                :style="{
                    margin: displaySettings.padding + 'px'
                }"
                @mousedown.prevent="handleEvent"
                @mousemove.prevent="handleEvent"
                @touchstart.prevent="handleEvent"
                @touchend.prevent="handleEvent"
                @touchmove.prevent="handleEvent"
                @dblclick.prevent="handleEvent"
                @click.prevent="handleEvent"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="handleEvent"
                @contextmenu.prevent
            >
                <!-- Canvas Grid Overlay -->
                <FuiGrid
                    :width="display.x * scale.x * pixelSize.x"
                    :height="display.y * scale.y * pixelSize.y"
                    :cell-size="scale.x * pixelSize.x"
                    :opacity="displaySettings.grid.opacity"
                    :color="displaySettings.grid.color"
                    :visible="displaySettings.grid.visible"
                    :line-width="displaySettings.grid.width"
                />
                
                <canvas
                    ref="screen"
                    class="screen"
                    :width="display.x"
                    :height="display.y"
                    :style="{
                        width: display.x * scale.x * pixelSize.x + 'px',
                        height: display.y * scale.y * pixelSize.y + 'px',
                        backgroundColor: displaySettings.backgroundColor,
                        boxShadow: `0 0 ${displaySettings.glow}px ${displaySettings.backgroundColor}`
                    }"
                />
            </div>
        </div>
    </div>
</template>
<style lang="css">
.canvas-wrapper {
    margin: 0 auto;
    display: inline-block;
    font-size: 0;
    position: relative;
    background-color: white;
    height: fit-content;
    border: 10px solid oklch(var(--b1));
    transition: background-color 0.2s, padding 0.2s;
    overflow: visible; /* Allow glow to extend beyond wrapper */
}

.fui-canvas__event-target {
    position: relative;
    overflow: visible;
}

.fui-canvas__selection {
    position: absolute;
    border: 2px dashed #ffffff70;
    background-color: #ffffff10;
    box-sizing: content-box;
    z-index: 2;
    pointer-events: none;
    display: none;
    translate: transform(-50%, -50%);
}

.locked {
    opacity: 0.5;
    cursor: wait !important;
    pointer-events: none !important;
}

.screen {
    image-rendering: pixelated;
    background: black;
    text-rendering: geometricPrecision;
    font-smooth: never;
    -webkit-font-smoothing: none;
}

.fui-grid {
    box-sizing: content-box;
    position: relative;
    border: 1px solid oklch(var(--s));
    overflow: visible; /* Allow glow to extend beyond grid */
}



.fui-canvas_select {
    cursor: default;
}

.fui-canvas_draw {
    cursor: crosshair;
}
</style>
