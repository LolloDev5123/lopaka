<script lang="ts" setup>
import {UnwrapRef, computed, ref} from 'vue';
import {AbstractLayer} from '../../core/layers/abstract.layer';
import {useSession} from '../../core/session';
import {TextLayer} from '../../core/layers/text.layer';
import {IconLayer} from '../../core/layers/icon.layer';
import VueDraggable from 'vuedraggable';
import Icon from '/src/components/layout/Icon.vue';
import {PaintLayer} from '/src/core/layers/paint.layer';
import FuiContextMenu, {ContextMenuAction} from './FuiContextMenu.vue';
import FuiLayerItem from './FuiLayerItem.vue';

const props = defineProps<{
    readonly?: boolean;
}>();

const session = useSession();
const drag = ref(false);

// Context Menu State
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuActions = ref<ContextMenuAction[]>([]);

const disabled = computed(
    () =>
        session.editor.state.activeLayer?.getType() === 'paint' &&
        !(session.editor.state.activeLayer as PaintLayer).data
);

const layers = computed({
    get: () => session.state.layers.slice().sort((a, b) => b.index - a.index),
    set: (l) => {
        const len = l.length;
        l.forEach((layer, index) => {
            layer.index = len - index;
        });
        session.state.layers = l.slice().sort((a, b) => a.index - b.index);
        session.virtualScreen.redraw();
    },
});

function setActive(layer: UnwrapRef<AbstractLayer>) {
    session.state.layers.forEach((l) => (l.selected = false));
    layer.selected = true;
    session.editor.selectionUpdate();
    session.virtualScreen.redraw();
}

function toggleVisibility(layer: UnwrapRef<AbstractLayer>) {
    layer.visible = !layer.visible;
    session.virtualScreen.redraw();
}

function handleContextMenu({event, layer}: {event: MouseEvent, layer: UnwrapRef<AbstractLayer>}) {
    if (disabled.value) return;
    
    event.preventDefault();
    contextMenuX.value = event.clientX;
    contextMenuY.value = event.clientY;
    
    contextMenuActions.value = [
        {
            label: layer.locked ? 'Unlock' : 'Lock',
            icon: layer.locked ? 'lock-open' : 'lock-closed',
            action: () => {
                if (layer.locked) session.unlockLayer(layer as any);
                else session.lockLayer(layer as any);
            }
        },
        {
            label: layer.visible ? 'Hide' : 'Show',
            icon: layer.visible ? 'eye-off' : 'eye',
            action: () => toggleVisibility(layer)
        },
        {
            label: 'Duplicate',
            icon: 'clone',
            action: () => {
                const clone = layer.clone();
                // move slightly
                clone.bounds.x += 10;
                clone.bounds.y += 10;
                clone.name = `${layer.name} copy`;
                session.addLayer(clone);
                session.virtualScreen.redraw();
            }
        },
        {
            label: 'Delete',
            icon: 'trash',
            class: 'text-error',
            action: () => session.removeLayer(layer as any)
        }
    ];
    
    contextMenuVisible.value = true;
}

</script>
<template>
    <ul class="menu menu-xs w-[250px] p-0"> <!-- increased width for nested items -->
        <VueDraggable
            class="layers-list max-w-full"
            v-model="layers"
            item-key="uid"
            group="layers"
            @start="drag = true"
            @end="drag = false"
            :disabled="readonly || disabled"
        >
            <template #item="{element}">
                <FuiLayerItem
                    :element="element"
                    :disabled="disabled"
                    :readonly="readonly"
                    @activate="setActive"
                    @toggleVisibility="toggleVisibility"
                    @contextMenu="handleContextMenu"
                    @toggleLock="session.lockLayer(element as any)"
                    @unlock="session.unlockLayer(element as any)"
                />
            </template>
        </VueDraggable>
    </ul>
    
    <FuiContextMenu
        v-if="contextMenuVisible"
        :actions="contextMenuActions"
        :x="contextMenuX"
        :y="contextMenuY"
        @close="contextMenuVisible = false"
    />
</template>
<style lang="css" scoped>
.sortable-chosen {
    opacity: 0.5;
}

.sortable-ghost {
    opacity: 1;
    border: 1px dashed white;
}

.layer:hover .layer-actions {
    display: flex;
}

.layer_ignored {
    color: #999;
}

.layers-list {
    height: calc(100vh - 135px);
    overflow-y: auto;
}
</style>
