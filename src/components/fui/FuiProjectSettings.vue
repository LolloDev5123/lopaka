<script lang="ts" setup>
import {ref, computed, toRefs, watch} from 'vue';
import {useSession} from '../../core/session';
import {Point} from '../../core/point';
import Icon from '../layout/Icon.vue';

const session = useSession();
const {display, pixelSize, platform, displaySettings} = toRefs(session.state);

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

// Display Settings
const localBgColor = ref(displaySettings.value.backgroundColor);
const localFgColor = ref(displaySettings.value.foregroundColor);
const localGlow = ref(displaySettings.value.glow);
const localGridVisible = ref(displaySettings.value.grid.visible);
const localGridOpacity = ref(displaySettings.value.grid.opacity);
const localGridColor = ref(displaySettings.value.grid.color);
const localPadding = ref(displaySettings.value.padding);

// Store original values for cancel
const originalDisplay = new Point(display.value.x, display.value.y);
const originalPixelSize = new Point(pixelSize.value.x, pixelSize.value.y);
const originalPlatform = platform.value;
const originalDisplaySettings = JSON.parse(JSON.stringify(displaySettings.value));

const platforms = computed(() => Object.keys(session.platforms));

// Live preview - apply changes immediately
watch([localWidth, localHeight], ([newWidth, newHeight]) => {
    session.setDisplay(new Point(newWidth, newHeight), true);
    session.virtualScreen.redraw();
}, {immediate: false});

watch([localPixelX, localPixelY], ([newX, newY]) => {
    session.state.pixelSize.x = newX;
    session.state.pixelSize.y = newY;
    session.virtualScreen.redraw();
}, {immediate: false});

watch(localPlatform, (newPlatform) => {
    session.state.platform = newPlatform;
    session.virtualScreen.redraw();
}, {immediate: false});

// Watch Display Settings
watch([localBgColor, localFgColor, localGlow, localPadding], () => {
    session.state.displaySettings.backgroundColor = localBgColor.value;
    session.state.displaySettings.foregroundColor = localFgColor.value;
    session.state.displaySettings.glow = localGlow.value;
    session.state.displaySettings.padding = localPadding.value;
    session.virtualScreen.redraw();
});

watch([localGridVisible, localGridOpacity, localGridColor], () => {
    session.state.displaySettings.grid.visible = localGridVisible.value;
    session.state.displaySettings.grid.opacity = localGridOpacity.value;
    session.state.displaySettings.grid.color = localGridColor.value;
    // Grid might not need a full redraw if handled via CSS, but safe to call
}, {deep: true});

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
    session.state.displaySettings = originalDisplaySettings;
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
                            {{ session.platforms[p].getName() }}
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

            <div class="divider">Display Style</div>

            <div class="space-y-4">
                <!-- Colors -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text font-medium">Original Background</span>
                        </label>
                        <div class="flex gap-2 items-center">
                            <input type="color" class="input input-bordered p-0 w-12 h-10 shrink-0 overflow-hidden" v-model="localBgColor" />
                            <input type="text" class="input input-bordered w-full uppercase" v-model="localBgColor" maxlength="7" />
                        </div>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text font-medium">Active Pixel Color</span>
                        </label>
                        <div class="flex gap-2 items-center">
                            <input type="color" class="input input-bordered p-0 w-12 h-10 shrink-0 overflow-hidden" v-model="localFgColor" />
                            <input type="text" class="input input-bordered w-full uppercase" v-model="localFgColor" maxlength="7" />
                        </div>
                    </div>
                </div>

                <!-- Glow & Padding -->
                 <div class="grid grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text font-medium">Backlight Glow</span>
                            <span class="label-text-alt">{{ localGlow }}%</span>
                        </label>
                        <input 
                            type="range" 
                            class="range range-sm" 
                            v-model.number="localGlow"
                            min="0"
                            max="100"
                        />
                    </div>
                    
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text font-medium">Screen Padding</span>
                        </label>
                        <div class="flex gap-2 items-center">
                            <input 
                                type="number" 
                                class="input input-bordered w-full" 
                                v-model.number="localPadding"
                                min="0"
                                max="50"
                            />
                            <span class="text-sm text-gray-500">px</span>
                        </div>
                    </div>
                </div>
                
                <!-- Grid -->
                <div class="form-control">
                    <label class="label cursor-pointer justify-start gap-4">
                        <span class="label-text font-medium">Pixel Grid</span>
                        <input type="checkbox" class="toggle" v-model="localGridVisible" />
                    </label>
                    
                    <div v-if="localGridVisible" class="pl-4 mt-2 border-l-2 border-base-200">
                         <label class="label">
                             <span class="label-text font-medium">Grid Opacity & Color</span>
                             <span class="label-text-alt">{{ localGridOpacity }}%</span>
                        </label>
                        <div class="flex gap-2 items-center mb-2">
                            <input type="color" class="input input-bordered p-0 w-8 h-8 shrink-0 overflow-hidden" v-model="localGridColor" />
                            <input 
                                type="range" 
                                class="range range-xs" 
                                v-model.number="localGridOpacity"
                                min="0"
                                max="100"
                            />
                        </div>
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
