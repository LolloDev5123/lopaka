<script lang="ts" setup>
import {ref, computed, toRefs, watch} from 'vue';
import {useSession} from '../../core/session';
import {Point} from '../../core/point';
import Icon from '../layout/Icon.vue';

const session = useSession();
const {display, pixelSize, platform} = toRefs(session.state);

const emit = defineEmits(['close']);
const props = defineProps<{
    projectName: string;
}>();

const localProjectName = ref(props.projectName);
const localWidth = ref(display.value.x);
const localHeight = ref(display.value.y);
const localPixelX = ref(pixelSize.value.x);
const localPixelY = ref(pixelSize.value.y);
const localPlatform = ref(platform.value);

// Store original values for cancel
const originalDisplay = new Point(display.value.x, display.value.y);
const originalPixelSize = new Point(pixelSize.value.x, pixelSize.value.y);
const originalPlatform = platform.value;

const platforms = computed(() => Object.keys(session.platforms));

// Live preview - apply changes immediately
watch([localWidth, localHeight], ([newWidth, newHeight]) => {
    session.setDisplay(new Point(newWidth, newHeight), true);
}, {immediate: false});

watch([localPixelX, localPixelY], ([newX, newY]) => {
    session.state.pixelSize.x = newX;
    session.state.pixelSize.y = newY;
}, {immediate: false});

watch(localPlatform, (newPlatform) => {
    session.state.platform = newPlatform;
}, {immediate: false});

function applySettings() {
    // Changes already applied via watchers, just close and update name
    emit('close', localProjectName.value);
}

function cancel() {
    // Restore original values
    session.setDisplay(originalDisplay, true);
    session.state.pixelSize.x = originalPixelSize.x;
    session.state.pixelSize.y = originalPixelSize.y;
    session.state.platform = originalPlatform;
    emit('close', null);
}
</script>

<template>
    <dialog open class="modal" @click.self="cancel">
        <div class="modal-box max-w-2xl">
            <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                <Icon type="cog" />
                Project Settings
            </h3>
            
            <div class="space-y-4">
                <!-- Project Name -->
                <div class="form-control">
                    <label class="label">
                        <span class="label-text font-medium">Project Name</span>
                    </label>
                    <input 
                        type="text" 
                        class="input input-bordered w-full" 
                        v-model="localProjectName"
                        :placeholder="projectName"
                    />
                </div>
                
                <!-- Platform -->
                <div class="form-control">
                    <label class="label">
                        <span class="label-text font-medium">Platform / Library</span>
                    </label>
                    <select class="select select-bordered w-full" v-model="localPlatform">
                        <option v-for="p in platforms" :key="p" :value="p">
                            {{ session.platforms[p].name }}
                        </option>
                    </select>
                </div>
                
                <!-- Display Resolution -->
                <div class="form-control">
                    <label class="label">
                        <span class="label-text font-medium">Display Resolution</span>
                    </label>
                    <div class="flex gap-2 items-center">
                        <input 
                            type="number" 
                            class="input input-bordered w-24" 
                            v-model.number="localWidth"
                            min="1"
                            max="1024"
                        />
                        <span>×</span>
                        <input 
                            type="number" 
                            class="input input-bordered w-24" 
                            v-model.number="localHeight"
                            min="1"
                            max="1024"
                        />
                        <span class="text-sm text-gray-500">pixels</span>
                    </div>
                </div>
                
                <!-- Pixel Aspect Ratio -->
                <div class="form-control">
                    <label class="label">
                        <span class="label-text font-medium">Pixel Aspect Ratio (Width)</span>
                        <span class="label-text-alt">{{ localPixelX.toFixed(1) }}</span>
                    </label>
                    <input 
                        type="range" 
                        class="range range-sm" 
                        v-model.number="localPixelX"
                        min="0.5"
                        max="5"
                        step="0.1"
                    />
                </div>
                
                <div class="form-control">
                    <label class="label">
                        <span class="label-text font-medium">Pixel Aspect Ratio (Height)</span>
                        <span class="label-text-alt">{{ localPixelY.toFixed(1) }}</span>
                    </label>
                    <input 
                        type="range" 
                        class="range range-sm" 
                        v-model.number="localPixelY"
                        min="0.5"
                        max="5"
                        step="0.1"
                    />
                    <div class="flex justify-end mt-1">
                        <button 
                            class="btn btn-xs btn-ghost"
                            @click="localPixelX = 1; localPixelY = 1"
                        >
                            Reset to 1:1
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="modal-action">
                <button class="btn btn-ghost" @click="cancel">Cancel</button>
                <button class="btn btn-primary" @click="applySettings">Apply</button>
            </div>
        </div>
    </dialog>
</template>
