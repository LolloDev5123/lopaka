<script lang="ts" setup>
import {ref, toRefs} from 'vue';
import {useSession} from '../../../core/session';
import {Point} from '../../../core/point';
import Button from '/src/components/layout/Button.vue';

const session = useSession();
const {setDisplay, saveDisplayCustom, setPixelSize} = session;
const {display, pixelSize} = toRefs(session.state);

const emit = defineEmits(['cancelPopup', 'setCustomDisplay']);

const customWidth = ref(display.value.x);
const customHeight = ref(display.value.y);
const pixelRatio = ref(pixelSize.value.y / pixelSize.value.x);

function cancelPopup() {
    emit('cancelPopup');
}

function setCustomDisplay() {
    emit('setCustomDisplay');
    const displayCustom = new Point(customWidth.value || 1, customHeight.value || 1);
    const pixelSizeCustom = new Point(1, pixelRatio.value || 1);
    setDisplay(displayCustom, true);
    setPixelSize(pixelSizeCustom, true);
    saveDisplayCustom(true);
}
</script>
<template>
    <div class="fui-display-custom-dialog">
        <div class="font-bold text-lg pb-4">Set display size</div>
        <div class="fui-form-row">
            <label
                class="fui-form-label fui-form-column"
                for="displayCustomWidth"
            >
                Width:
                <input
                    class="fui-form-input fui-form-input__size"
                    type="number"
                    v-model="customWidth"
                    id="displayCustomWidth"
                />
            </label>
            <label
                class="fui-form-label fui-form-column"
                for="displayCustomWidth"
            >
                Height:
                <input
                    class="fui-form-input fui-form-input__size"
                    type="number"
                    min="1"
                    v-model="customHeight"
                    id="displayCustomHeight"
                />
            </label>
        </div>
        <div class="font-bold text-lg pb-4 pt-4">Set pixel ratio</div>
        <div class="fui-form-row">
            <label
                class="fui-form-label fui-form-column w-full"
                for="pixelRatio"
            >
                Ratio (Height / Width):
                <div class="flex flex-row items-center w-full">
                    <input
                        class="range range-xs flex-grow mr-2"
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.01"
                        v-model.number="pixelRatio"
                        id="pixelRatio"
                    />
                    <input
                        class="fui-form-input fui-form-input__size"
                        type="number"
                        min="0.1"
                        step="0.01"
                        v-model.number="pixelRatio"
                    />
                </div>
            </label>
        </div>
        <div class="buttons-bottom">
            <Button @click="cancelPopup">Cancel</Button>
            <Button
                @click="setCustomDisplay"
                :success="true"
            >
                Save
            </Button>
        </div>
    </div>
</template>
<style lang="css" scoped>
.fui-form-input__size {
    width: 68px;
}
</style>
