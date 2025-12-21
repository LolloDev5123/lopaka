<script lang="ts" setup>
import {onMounted, ref, toRefs} from 'vue';
import {useSession} from '/src/core/session';
import FuiEditor from '/src/components/fui/FuiEditor.vue';
import {Project, ProjectScreen} from '/src/types';
import FuiLayers from './fui/FuiLayers.vue';
import FuiScreens from '/src/components/fui/FuiScreens.vue';
import FuiProjectIO from '/src/components/fui/FuiProjectIO.vue';

const session = useSession();
const {setIsPublic} = session;
const currenProject = ref({} as Project);
const currentScreen = ref({} as ProjectScreen);
const isScreenLoaded = ref(false);
const isScreenNotFound = ref(false);
const infoMessage = ref();
const errorMessage = ref();

const emit = defineEmits(['showModal']);

onMounted(async () => {
    session.state.customImages = [];
    session.state.customFonts = [];
    isScreenLoaded.value = false;
    isScreenLoaded.value = true;
    session.initSandbox();
    isScreenLoaded.value = true;
    setIsPublic(false);
});

function setInfoMessage(msg) {
    infoMessage.value = msg;
    setTimeout(() => {
        infoMessage.value = null;
    }, 3000);
}
function setErrorMessage(msg) {
    errorMessage.value = msg;
    setTimeout(() => {
        errorMessage.value = null;
    }, 4000);
}
</script>

<template>
    <div class="flex flex-col flex-grow">
        <FuiEditor
            :project="currenProject"
            :screen="currentScreen"
            :isScreenLoaded="isScreenLoaded"
            :isScreenNotFound="isScreenNotFound"
            :isSandbox="true"
            @setErrorMessage="setErrorMessage"
            @setInfoMessage="setInfoMessage"
        >
            <template #messages>
                <div
                    class="alert alert-warning"
                    v-if="errorMessage"
                >
                    <span>{{ errorMessage }}</span>
                </div>
                <div
                    class="alert alert-success"
                    v-if="infoMessage"
                >
                    <span>{{ infoMessage }}</span>
                </div>
            </template>
            <template #title>
                <div class="flex justify-center py-3 px-4 border-b border-base-300 mb-4">
                    <FuiProjectIO />
                </div>
            </template>
            <template #left>
                <div class="flex flex-col h-full">
                    <FuiScreens />
                    <FuiLayers class="flex-grow" />
                </div>
            </template>
        </FuiEditor>
    </div>
</template>
