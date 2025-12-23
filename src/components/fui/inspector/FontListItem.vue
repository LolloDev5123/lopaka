<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { loadFont } from '/src/draw/fonts/index';
import { useFontRender } from '/src/composables/useFontRender';

const props = defineProps<{
    platformFont: TPlatformFont;
}>();

const { renderFontToCanvas } = useFontRender();
const container = ref<HTMLElement | null>(null);
const isLoading = ref(true);

const generatePreview = async () => {
    isLoading.value = true;
    if (container.value) {
        container.value.innerHTML = '';
    }
    
    try {
        const loadedFont = await loadFont(props.platformFont);
        if (loadedFont) {
             const canvas = renderFontToCanvas(loadedFont, props.platformFont.title, 1);
            if (canvas && container.value) {
                container.value.appendChild(canvas);
            }
        }
    } catch (e) {
        console.error("Failed to render inline font preview", e);
    } finally {
        isLoading.value = false;
    }
};

onMounted(generatePreview);
watch(() => props.platformFont, generatePreview);
</script>

<template>
    <div class="flex items-center w-full h-8 overflow-hidden relative">
        <div v-if="isLoading" class="loading loading-spinner loading-xs text-primary absolute left-0"></div>
        <div ref="container" class="font-preview-canvas w-full h-full flex items-center justify-start text-base-content" :title="platformFont.title" :class="{'opacity-0': isLoading, 'opacity-100': !isLoading}">
            <!-- Content appended here -->
        </div>
        <div v-if="!isLoading && !container?.hasChildNodes()" class="text-xs opacity-50 ml-2">
            {{ platformFont.title }}
        </div>
    </div>
</template>

<style scoped>
.font-preview-canvas :deep(canvas) {
    max-width: 100%;
    max-height: 32px;
    object-fit: contain;
    /* Invert colors if needed for dark mode, but canvas draws white text by default in my composable */
}
</style>
