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
const renamingUid = ref<string | null>(null);

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

// function setActive(layer: UnwrapRef<AbstractLayer>) {
//     session.state.layers.forEach((l) => (l.selected = false));
//     layer.selected = true;
//     session.editor.selectionUpdate();
//     session.virtualScreen.redraw();
// }

function setActive(layer: UnwrapRef<AbstractLayer>, event: MouseEvent) {
    const multi = event.ctrlKey || event.metaKey || event.shiftKey;
    session.selectLayer(layer as any, multi);
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
    
    const selectedLayers = session.getSelectedLayers();
    // If target layer is not in selection, select it (single)
    if (!selectedLayers.find(l => l.uid === layer.uid)) {
        session.selectLayer(layer as any);
        // re-fetch selected (now just this one)
    }
    const finalSelection = session.getSelectedLayers();
    const count = finalSelection.length;
    const labelSuffix = count > 1 ? ` (${count})` : '';
    
    contextMenuActions.value = [
        ...(count > 1 ? [{
            label: 'Group Selected',
            icon: 'folder', // Need to check if folder icon exists or use generic
            action: () => {
                session.groupLayers(finalSelection);
                contextMenuVisible.value = false;
            }
        }] : []),
        {
            label: 'Rename',
            icon: 'edit',
            action: () => {
                renamingUid.value = layer.uid;
                contextMenuVisible.value = false;
            }
        },
        {
            label: (layer.locked ? 'Unlock' : 'Lock') + labelSuffix,
            icon: layer.locked ? 'lock-open' : 'lock-closed',
            action: () => {
                const toLock = !layer.locked;
                finalSelection.forEach(l => {
                    if (toLock) session.lockLayer(l as any);
                    else session.unlockLayer(l as any);
                });
            }
        },
        {
            label: (layer.visible ? 'Hide' : 'Show') + labelSuffix,
            icon: layer.visible ? 'eye-off' : 'eye',
            action: () => {
                const toShow = !layer.visible;
                finalSelection.forEach(l => {
                    l.visible = toShow;
                });
                session.virtualScreen.redraw();
            }
        },
        {
            label: 'Duplicate' + labelSuffix,
            icon: 'clone',
            action: () => {
                // Determine offset for all
                finalSelection.forEach(l => {
                    const clone = l.clone();
                    clone.bounds.x += 10;
                    clone.bounds.y += 10;
                    clone.name = `${l.name} copy`;
                    session.addLayer(clone);
                });
                session.virtualScreen.redraw();
            }
        },
        {
            label: 'Delete' + labelSuffix,
            icon: 'trash',
            class: 'text-error',
            action: () => {
                finalSelection.forEach(l => session.removeLayer(l as any));
            }
        }
    ];
    
    contextMenuVisible.value = true;
}

</script>
<template>
    <ul class="menu menu-xs w-full max-w-full p-0">
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
                    :renaming-uid="renamingUid"
                    @activate="(layer, event) => setActive(layer, event)" 
                    @toggleVisibility="toggleVisibility"
                    @contextMenu="handleContextMenu"
                    @toggleLock="session.lockLayer(element as any)"
                    @unlock="session.unlockLayer(element as any)"
                    @startRenaming="renamingUid = $event"
                    @stopRenaming="renamingUid = null"
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
