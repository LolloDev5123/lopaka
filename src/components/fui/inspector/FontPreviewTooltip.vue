<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { loadFont } from '/src/draw/fonts/index';
import { useFontRender } from '/src/composables/useFontRender';

const props = defineProps<{
    platformFont: TPlatformFont;
}>();

const { renderFontToCanvas } = useFontRender();
const previewContainer = ref<HTMLElement | null>(null);
const isLoading = ref(true);

const generatePreview = async () => {
    isLoading.value = true;
    if (previewContainer.value) {
        previewContainer.value.innerHTML = '';
    }
    
    try {
        const loadedFont = await loadFont(props.platformFont);
        if (loadedFont) {
             const canvas = renderFontToCanvas(loadedFont, 'Abc 123');
            if (canvas && previewContainer.value) {
                previewContainer.value.appendChild(canvas);
            }
        }
    } catch (e) {
        console.error("Failed to load font preview", e);
    } finally {
        isLoading.value = false;
    }
};

onMounted(generatePreview);
watch(() => props.platformFont, generatePreview);
</script>

<template>
    <div class="p-2 bg-neutral text-neutral-content rounded shadow-lg border border-neutral-content/20 font-preview-tooltip z-[100] pointer-events-none">
        <div v-if="isLoading" class="loading loading-spinner loading-xs text-primary"></div>
        <div v-else ref="previewContainer" class="flex justify-center items-center min-h-[20px]"></div>
    </div>
</template>

<style scoped>
.font-preview-tooltip {
    min-width: 100px;
    background-color: #1a1a1a;
    backdrop-filter: blur(4px);
}
</style>
