<script lang="ts" setup>
import {UnwrapRef, ref, computed} from 'vue';
import {AbstractLayer} from '/src/core/layers/abstract.layer';
import {GroupLayer} from '/src/core/layers/group.layer';
import Icon from '/src/components/layout/Icon.vue';
import {PaintLayer} from '/src/core/layers/paint.layer';
import VueDraggable from 'vuedraggable';

const props = defineProps<{
    element: AbstractLayer;
    disabled?: boolean;
    readonly?: boolean;
    renamingUid?: string | null;
}>();

const emit = defineEmits(['activate', 'toggleVisibility', 'contextMenu', 'toggleLock', 'unlock', 'startRenaming', 'stopRenaming']);

const isOpen = ref(true);
const nameInput = ref<HTMLInputElement | null>(null);

const isRenaming = computed(() => props.renamingUid === props.element.uid);

import { watch, nextTick } from 'vue';

watch(isRenaming, (val) => {
    if (val) {
        nextTick(() => {
            nameInput.value?.focus();
            nameInput.value?.select();
        });
    }
});

function activeRenameStop() {
    emit('stopRenaming');
}

function onToggleOpen() {
    // If we want state persistence for open/close, we should map 'expanded' property in GroupLayer
    if (props.element instanceof GroupLayer) {
        props.element.expanded = !props.element.expanded;
    }
    isOpen.value = !isOpen.value;
}

const isGroup = computed(() => props.element instanceof GroupLayer);
const children = computed({
    get: () => (props.element as GroupLayer).children || [],
    set: (val) => {
        if (props.element instanceof GroupLayer) {
            props.element.children = val;
            // trigger redraw/save?
        }
    }
});

function classNames(layer) {
    return {
        'bg-base-300': layer.selected,
        'text-gray-500': layer.overlay,
        'opacity-50': !layer.visible,
    };
}
</script>

<template>
    <li
        class="layer"
        @click.stop="!disabled && emit('activate', element, $event)"
        @contextmenu.stop="emit('contextMenu', {event: $event, layer: element})"
        v-show="element.type !== 'paint' || (element.type === 'paint' && (element as PaintLayer).data)"
    >
        <a
            class="flex h-6 max-w-full pl-1 mb-[1px] rounded-none group items-center"
            :class="classNames(element)"
            :style="{paddingLeft: isGroup ? '0px' : ''}"
        >
            <!-- Visibility Toggle -->
            <div 
                class="mr-1 cursor-pointer hover:text-base-content" 
                :class="element.visible ? 'text-gray-400' : 'text-gray-600'"
                @click.stop="emit('toggleVisibility', element)"
            >
                <Icon
                    :type="element.visible ? 'eye' : 'eye-off'"
                    xs
                />
            </div>

            <!-- Group arrow -->
            <div 
                 v-if="isGroup"
                 class="mr-1 cursor-pointer"
                 @click.stop="onToggleOpen"
            >
                <Icon 
                    :type="(element as GroupLayer).expanded ? 'chevron-down' : 'chevron-right'" 
                    xs 
                />
            </div>
            
            <!-- Icon -->
            <Icon
                :type="element.type"
                sm
                class="text-gray-500 min-w-4 mr-1"
            ></Icon>
            
            <div class="truncate grow min-w-0 flex items-center overflow-hidden" @dblclick.stop="!readonly && !disabled && emit('startRenaming', element.uid)">
                <input
                    v-if="isRenaming"
                    ref="nameInput"
                    type="text"
                    class="flex-1 p-0 h-5 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-inherit"
                    style="min-width: 0; box-sizing: border-box;"
                    v-model="element.name"
                    @blur="activeRenameStop"
                    @keydown.enter="activeRenameStop"
                    @click.stop
                />
                <span v-else class="truncate">{{ element.name }}</span>
            </div>
            
            <!-- Lock Actions -->
            <div
                v-if="!readonly && element.locked"
                class="btn btn-xs btn-square btn-ghost layer-actions -mr-2"
                @click.stop="!disabled && emit('unlock', element)"
            >
                <Icon
                    type="lock-closed"
                    xs
                />
            </div>
            <div
                v-if="!readonly && !element.locked"
                class="btn btn-xs btn-square btn-ghost hidden layer-actions -mr-2 group-hover:flex"
                @click.stop="!disabled && emit('toggleLock', element)"
            >
                <Icon
                    type="lock-open"
                    xs
                />
            </div>
        </a>
        
        <!-- Recursive Children -->
        <ul v-if="isGroup && (element as GroupLayer).expanded" class="pl-4 border-l border-base-200">
             <VueDraggable
                class="layers-list-nested max-w-full"
                v-model="children"
                item-key="uid"
                group="layers"
                :disabled="readonly || disabled"
            >
                <template #item="{element: child}">
                    <FuiLayerItem
                        :element="child"
                        :disabled="disabled"
                        :readonly="readonly"
                        :renaming-uid="renamingUid"
                        @activate="emit('activate', $event)"
                        @toggleVisibility="emit('toggleVisibility', $event)"
                        @contextMenu="emit('contextMenu', $event)" 
                        @toggleLock="emit('toggleLock', $event)"
                        @unlock="emit('unlock', $event)"
                        @startRenaming="emit('startRenaming', $event)"
                        @stopRenaming="emit('stopRenaming')"
                    />
                </template>
            </VueDraggable>
        </ul>
    </li>
</template>

<style scoped>
.layer:hover .layer-actions {
    display: flex;
}
</style>
