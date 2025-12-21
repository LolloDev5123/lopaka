<script lang="ts" setup>
import {ref, computed} from 'vue';
import {useSession} from '../../core/session';
import Icon from '../layout/Icon.vue';
import FuiProjectSettings from './FuiProjectSettings.vue';

const session = useSession();
const showRenameDialog = ref(false);
const showSettingsDialog = ref(false);
const projectName = ref('Untitled Project');
const newProjectName = ref('');

const displayName = computed(() => projectName.value);

function newProject() {
    if (confirm('Start a new project? Current work will be lost unless exported.')) {
        session.state.screens = [{
            id: 1,
            name: 'Screen 1',
            layers: [],
            preview: ''
        }];
        session.state.activeScreenId = 1;
        session.state.layers = [];
        projectName.value = 'Untitled Project';
        session.virtualScreen.redraw();
    }
}

function exportProject() {
    const jsonData = session.exportProject();
    const blob = new Blob([jsonData], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = projectName.value.toLowerCase().replace(/\s+/g, '-');
    a.download = `${filename}-${Date.now()}.lpk`;
    a.click();
    URL.revokeObjectURL(url);
}

function importProject(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = session.importProject(content);
        if (success) {
            projectName.value = file.name.replace('.lpk', '').replace(/\-\d+$/, '');
            alert('Project imported successfully!');
        } else {
            alert('Failed to import project. Please check the file format.');
        }
        // Reset input
        input.value = '';
    };
    reader.readAsText(file);
}

function openRenameDialog() {
    newProjectName.value = projectName.value;
    showRenameDialog.value = true;
}

function renameProject() {
    if (newProjectName.value.trim()) {
        projectName.value = newProjectName.value.trim();
    }
    showRenameDialog.value = false;
}

function openSettings() {
    showSettingsDialog.value = true;
}

function closeSettings(newName: string | null) {
    showSettingsDialog.value = false;
    if (newName && newName.trim()) {
        projectName.value = newName.trim();
    }
}

// Computed properties for breadcrumb and tags
const currentScreenName = computed(() => {
    try {
        const activeScreen = session.state.screens?.find(s => s.id === session.state.activeScreenId);
        return activeScreen?.name || 'Screen 1';
    } catch (e) {
        return 'Screen 1';
    }
});

const selectedLayerPath = computed(() => {
    try {
        if (!session.getSelectedLayers) return '';
        const selected = session.getSelectedLayers();
        if (!selected || selected.length === 0) return '';
        if (selected.length === 1) return selected[0].name || `Layer ${selected[0].index}`;
        return `${selected.length} layers`;
    } catch (e) {
        return '';
    }
});

const platformName = computed(() => {
    try {
        const platform = session.getPlatform?.();
        return platform?.id || session.state.platform || 'u8g2';
    } catch (e) {
        return 'u8g2';
    }
});

const displayResolution = computed(() => {
    try {
        return `${session.state.display?.x || 128}×${session.state.display?.y || 64}`;
    } catch (e) {
        return '128×64';
    }
});
</script>

<template>
    <div class="flex items-center justify-between gap-4 w-full">
        <!-- Left side: Breadcrumb navigation with tags -->
        <div class="flex items-center gap-2">
            <!-- Project indicator dot -->
            <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
            
            <!-- Breadcrumb: Project Name -->
            <span class="font-semibold text-white text-base">{{ displayName }}</span>
            
            <!-- Separator -->
            <span class="text-gray-500">›</span>
            
            <!-- Screen Name -->
            <span class="text-gray-300 text-sm">{{ currentScreenName }}</span>
            
            <!-- Layer breadcrumb (if selected) -->
            <template v-if="selectedLayerPath">
                <span class="text-gray-500">›</span>
                <span class="text-gray-400 text-sm">{{ selectedLayerPath }}</span>
            </template>
            
            <!-- Metadata Tags -->
            <div class="flex items-center gap-1 ml-2">
                <!-- Library tag -->
                <span class="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                    {{ platformName }}
                </span>
                
                <!-- Resolution tag -->
                <span class="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                    {{ displayResolution }}
                </span>
            </div>
        </div>
        
        <!-- Right side: Action buttons -->
        <div class="flex items-center gap-1">
            <!-- Settings Button -->
            <button 
                class="btn btn-sm btn-ghost btn-circle" 
                @click="openSettings"
                title="Project Settings"
            >
                <Icon type="cog" sm />
            </button>
            
            <!-- New Project -->
            <button 
                class="btn btn-sm btn-ghost btn-circle" 
                @click="newProject" 
                title="New Project"
            >
                <Icon type="plus" sm />
            </button>
            
            <!-- Import -->
            <label class="btn btn-sm btn-ghost btn-circle" title="Import Project">
                <Icon type="upload" sm />
                <input 
                    type="file" 
                    accept=".lpk" 
                    class="hidden" 
                    @change="importProject"
                />
            </label>
            
            <!-- Export -->
            <button 
                class="btn btn-sm btn-ghost btn-circle" 
                @click="exportProject" 
                title="Export Project"
            >
                <Icon type="download" sm />
            </button>
        </div>
    </div>
    
    <!-- Settings Dialog -->
    <FuiProjectSettings 
        v-if="showSettingsDialog"
        :project-name="projectName"
        @close="closeSettings"
    />
    
    <!-- Rename Dialog (Deprecated - moved to settings) -->
    <dialog :open="showRenameDialog" class="modal" @click.self="showRenameDialog = false">
        <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Rename Project</h3>
            <input 
                type="text" 
                class="input input-bordered w-full" 
                v-model="newProjectName"
                @keydown.enter="renameProject"
                placeholder="Project name"
            />
            <div class="modal-action">
                <button class="btn btn-ghost" @click="showRenameDialog = false">Cancel</button>
                <button class="btn btn-primary" @click="renameProject">Rename</button>
            </div>
        </div>
    </dialog>
</template>
