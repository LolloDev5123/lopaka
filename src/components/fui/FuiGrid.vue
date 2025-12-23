<template>
    <canvas
        ref="gridCanvas"
        class="grid-canvas"
        :width="width * 2"
        :height="height * 2"
        :style="{
            width: width + 'px',
            height: height + 'px',
            opacity: opacity / 100,
            display: visible ? 'block' : 'none'
        }"
    />
</template>

<script setup lang="ts">
import {ref, watch, onMounted} from 'vue';

const props = defineProps<{
    width: number;
    height: number;
    cellSize: number;
    color: string;
    opacity: number;
    visible: boolean;
    lineWidth: number;
}>();

const gridCanvas = ref<HTMLCanvasElement | null>(null);

function drawGrid() {
    if (!gridCanvas.value) return;
    
    const canvas = gridCanvas.value;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Reset transform to prevent cumulative scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!props.visible) return;
    
    // Set retina scaling
    const dpr = 2;
    ctx.scale(dpr, dpr);
    
    ctx.strokeStyle = props.color;
    ctx.lineWidth = props.lineWidth;
    ctx.beginPath();
    
    // Draw vertical lines
    for (let x = 0; x <= props.width; x += props.cellSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, props.height);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= props.height; y += props.cellSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(props.width, y);
    }
    
    ctx.stroke();
}

watch(() => [props.width, props.height, props.cellSize, props.color, props.visible, props.lineWidth], () => {
    drawGrid();
}, {deep: true});

onMounted(() => {
    drawGrid();
});
</script>

<style scoped>
.grid-canvas {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 100;
    image-rendering: pixelated;
}
</style>
