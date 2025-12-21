<script lang="ts" setup>
import {ref, computed} from 'vue';
import {useSession} from '../../core/session';
import Icon from '/src/components/layout/Icon.vue';

import {nextTick} from 'vue';
import FuiContextMenu, {ContextMenuAction} from './FuiContextMenu.vue';

const session = useSession();
const screens = computed(() => session.state.screens);
const activeScreenId = computed(() => session.state.activeScreenId);

const newScreenName = ref('');
const isAdding = ref(false);

const renamingScreenId = ref<number | null>(null);
const screenParamsInput = ref<HTMLInputElement | null>(null);

const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuActions = ref<ContextMenuAction[]>([]);

function startRenaming(id: number) {
    renamingScreenId.value = id;
    nextTick(() => {
        // Ref is in v-for, so it's an array?
        // With basic ref usage in v-for, it might be an array in Vue 3.
        // Or last bound?
        // Let's assume array if multiple.
        const input = Array.isArray(screenParamsInput.value) ? screenParamsInput.value[0] : screenParamsInput.value;
        input?.focus();
        input?.select();
    });
}

function stopRenaming() {
    renamingScreenId.value = null;
}

function handleContextMenu(event: MouseEvent, screen: any) {
    event.preventDefault();
    contextMenuX.value = event.clientX;
    contextMenuY.value = event.clientY;
    
    contextMenuActions.value = [
        {
            label: 'Rename',
            icon: 'edit',
            action: () => {
                startRenaming(screen.id);
                contextMenuVisible.value = false;
            }
        },
        {
            label: 'Delete',
            icon: 'trash',
            class: 'text-error',
            action: () => {
                deleteScreen(screen.id);
            }
        }
    ];
    contextMenuVisible.value = true;
}

function selectScreen(id: number) {
    session.setActiveScreen(id);
}

function addScreen() {
    session.addScreen(newScreenName.value || `Screen ${screens.value.length + 1}`);
    newScreenName.value = '';
    isAdding.value = false;
}

function deleteScreen(id: number) {
     const idx = session.state.screens.findIndex(s => s.id === id);
     if (idx > -1) {
         session.state.screens.splice(idx, 1);
         if (session.state.activeScreenId === id) {
             const next = session.state.screens[0];
             if (next) session.setActiveScreen(next.id);
             else session.clearLayers(); 
         }
     }
}
</script>

<template>
    <div class="screens-panel border-b border-base-300 p-2">
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xs font-bold uppercase text-gray-500">Screens</h3>
            <button class="btn btn-xs btn-ghost" @click="addScreen">
                <Icon type="plus" xs />
            </button>
        </div>
        
        <ul class="screens-list grid grid-cols-2 gap-2">
            <li 
                v-for="screen in screens" 
                :key="screen.id"
                class="screen-item p-1 border rounded cursor-pointer hover:bg-base-200 relative group"
                :class="{'border-primary': screen.id === activeScreenId, 'border-base-200': screen.id !== activeScreenId}"
                @click="selectScreen(screen.id)"
                @contextmenu.prevent="handleContextMenu($event, screen)"
            >
                <div class="aspect-[2/1] bg-base-100 mb-1 relative overflow-hidden flex items-center justify-center">
                    <img v-if="screen.preview" :src="screen.preview" class="max-w-full max-h-full" />
                    <span v-else class="text-xs text-gray-300">No Preview</span>
                </div>
                <!-- Name / Rename Input -->
                <div 
                    class="text-[10px] truncate text-center h-4"
                    @dblclick.stop="startRenaming(screen.id)"
                >
                    <input
                        v-if="renamingScreenId === screen.id"
                        ref="screenParamsInput"
                        type="text"
                        class="input input-xs input-ghost w-full p-0 h-4 text-center bg-base-100"
                        v-model="screen.name"
                        @blur="stopRenaming"
                        @keydown.enter="stopRenaming"
                        @click.stop
                    />
                    <span v-else>{{ screen.name }}</span>
                </div>
                
                <!-- Delete Action (Hover) -->
                <!-- <div 
                    v-if="screens.length > 1"
                    class="absolute top-0 right-0 p-1 hidden group-hover:block"
                    @click.stop="deleteScreen(screen.id)"
                >
                     <Icon type="trash" xs class="text-error" />
                </div> -->
            </li>
        </ul>
        
        <FuiContextMenu
            v-if="contextMenuVisible"
            :actions="contextMenuActions"
            :x="contextMenuX"
            :y="contextMenuY"
            @close="contextMenuVisible = false"
        />
    </div>
</template>

<style scoped>
.screens-panel {
    max-height: 200px;
    overflow-y: auto;
}
</style>
