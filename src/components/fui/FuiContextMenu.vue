<script lang="ts" setup>
import {onMounted, onUnmounted, ref} from 'vue';
import Icon from '/src/components/layout/Icon.vue';

export type ContextMenuAction = {
    label: string;
    icon?: string;
    action: () => void;
    disabled?: boolean;
    class?: string;
};

const props = defineProps<{
    actions: ContextMenuAction[];
    x: number;
    y: number;
}>();

const emit = defineEmits(['close']);

const menu = ref<HTMLElement | null>(null);

function close() {
    emit('close');
}

function handleClickOutside(event: MouseEvent) {
    if (menu.value && !menu.value.contains(event.target as Node)) {
        close();
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('contextmenu', handleClickOutside);
});
</script>

<template>
    <div
        ref="menu"
        class="fui-context-menu fixed z-50 bg-base-100 border border-base-300 rounded shadow-lg p-1 min-w-[150px]"
        :style="{top: y + 'px', left: x + 'px'}"
        @contextmenu.prevent
    >
        <ul class="menu menu-sm p-0">
            <li
                v-for="(item, index) in actions"
                :key="index"
            >
                <a
                    :class="[{disabled: item.disabled}, item.class]"
                    @click="!item.disabled && (item.action(), close())"
                >
                    <Icon
                        v-if="item.icon"
                        :type="item.icon"
                        sm
                    />
                    {{ item.label }}
                </a>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.fui-context-menu {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
