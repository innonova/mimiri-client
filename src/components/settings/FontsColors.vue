<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Fonts']"></TabBar>
		<div class="overflow-y-auto pb-10">
			<div class="grid grid-cols-[5rem_12rem] gap-3 items-baseline mx-1 mt-2">
				<div class="col-span-2">Editor</div>
				<hr class="col-span-2 mt-[-0.4rem]" />
				<div>Font Family:</div>
				<select v-model="editorFontFamily">
					<template v-for="item of fontManager.families" :key="item">
						<option :value="item">{{ item }}</option>
					</template>
					<option value="CUSTOM">Custom</option>
				</select>
				<div v-if="editorFontFamily === 'CUSTOM'" class="col-span-2 mt-1 mb-[-0.1rem]">
					Name of a font installed on your system:
				</div>
				<div v-if="editorFontFamily === 'CUSTOM'">Font Name:</div>
				<input v-if="editorFontFamily === 'CUSTOM'" type="text" class="basic-input" v-model="customFontFamily" />
				<div>Font Size:</div>
				<select v-model="editorFontSize">
					<template v-for="item of fontManager.sizes" :key="item">
						<option :value="item">{{ item }}</option>
					</template>
				</select>
				<!-- <div class="col-span-2 mt-5">User Interface</div>
		<hr class="col-span-2 mt-[-0.4rem]" /> -->
			</div>
			<div class="mt-10 max-w-110 mr-2">
				<hr />
				<div class="w-full flex justify-between mt-2 gap-2">
					<button @click="reset" class="secondary">Restore defaults</button>
					<button :disabled="!canSave" @click="save" class="primary">Save</button>
				</div>
			</div>
			<div class="mt-10 mb-2 ml-1 text-size-title">{{ currentFontFamily }} ({{ editorFontSize }})</div>
			<div
				class="w-120 whitespace-pre-wrap bg-input p-2"
				:style="`font-family: '${currentFontFamily}', 'Courier New'; font-size: ${editorFontSize}px; line-height:1em`"
			>
				{{ sampleText }}
				<br />
				<span>normal text</span><br />
				<b>bold text</b><br />
				<i>italic text</i><br />
				<i><b>bold italic text</b></i>
			</div>
			<div class="mt-10 mb-2 ml-1 text-size-title">
				{{ settingsManager.editorFontFamily }} ({{ settingsManager.editorFontSize }})
			</div>
			<div
				class="w-120 whitespace-pre-wrap bg-input p-2"
				:style="`font-family: '${settingsManager.editorFontFamily}', 'Blackadder ITC'; font-size: ${settingsManager.editorFontSize}px; line-height:1em`"
			>
				{{ sampleText }}
				<br />
				<span>normal text</span><br />
				<b>bold text</b><br />
				<i>italic text</i><br />
				<i><b>bold italic text</b></i>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { settingsManager } from '../../services/settings-manager'
import TabBar from '../elements/TabBar.vue'
import { fontManager } from '../../global'

const emit = defineEmits(['close'])

const editorFontFamily = ref('')
const customFontFamily = ref('')
const editorFontSize = ref(14)
const canSave = computed(
	() =>
		editorFontFamily.value !== settingsManager.editorFontFamily ||
		editorFontSize.value !== settingsManager.editorFontSize,
)

const currentFontFamily = computed(() =>
	editorFontFamily.value !== 'CUSTOM' ? editorFontFamily.value : customFontFamily.value,
)

watch([editorFontFamily], () => {
	if (editorFontFamily.value !== 'CUSTOM') {
		fontManager.load(editorFontFamily.value)
	}
})

onMounted(async () => {
	if (fontManager.exists(settingsManager.editorFontFamily)) {
		editorFontFamily.value = settingsManager.editorFontFamily
	} else {
		editorFontFamily.value = 'CUSTOM'
		customFontFamily.value = settingsManager.editorFontFamily
	}
	editorFontSize.value = settingsManager.editorFontSize
})

const reset = async () => {
	document.body.style.fontSize = '16px'
	editorFontFamily.value = 'Consolas'
	editorFontSize.value = 14
	await save()
}

const save = async () => {
	if (editorFontFamily.value !== 'CUSTOM') {
		settingsManager.editorFontFamily = editorFontFamily.value
	} else {
		settingsManager.editorFontFamily = customFontFamily.value
	}
	settingsManager.editorFontSize = editorFontSize.value
	var root = document.querySelector(':root') as HTMLElement
	root.style.setProperty(
		'--font-editor',
		`'${editorFontFamily.value}', 'Consolas', 'Menlo', 'Droid Sans Mono', 'monospace', 'Courier New'`,
	)
	root.style.setProperty('--text-size-editor', `${editorFontSize.value}px`)
}

const sampleText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent elit augue,

auctor eu vulputate ac, fringilla non lacus. Nam ornare viverra ex id molestie. Duis tempus, neque vel posuere porta, dui odio venenatis ex, id vestibulum diam ipsum sit amet nisl.

- Nam pellentesque, erat ac feugiat aliquam,
- dui metus viverra nunc, eget condimentum magna lectus sit amet purus.
- In posuere dui ac justo dictum interdum. Nullam iaculis semper lacus

`
</script>
