<template>
	<TabBar :items="['Fonts & Colors']"></TabBar>
	<div class="grid grid-cols-[5rem_12rem] gap-3 items-baseline mx-1 mt-5">
		<div class="col-span-2">Editor</div>
		<hr class="col-span-2 mt-[-0.4rem]" />
		<div>Font Family:</div>
		<select v-if="fontManager.hasPermission" v-model="editorFontFamily">
			<template v-for="item of fontManager.families" :key="item">
				<option :value="item">{{ item }}</option>
			</template>
		</select>
		<button v-if="fontManager.canGetPermission" @click="loadFonts" class="primary">
			Grant permission to load fonts
		</button>
		<input
			v-if="!fontManager.hasPermission && !fontManager.canGetPermission"
			v-model="editorFontFamily"
			type="text"
			class="basic-input"
		/>
		<div>Font Size:</div>
		<select v-model="editorFontSize">
			<option value="8">8</option>
			<option value="9">9</option>
			<option value="10">10</option>
			<option value="11">11</option>
			<option value="12">12</option>
			<option value="13">13</option>
			<option value="14">14</option>
			<option value="15">15</option>
			<option value="16">16</option>
			<option value="17">17</option>
			<option value="18">18</option>
			<option value="19">19</option>
			<option value="20">20</option>
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
	<div class="mt-10 mb-2 ml-1 text-size-title">Editor Sample</div>
	<div
		class="w-120 whitespace-pre-wrap bg-input p-2"
		:style="`font-family: ${editorFontFamily}; font-size: ${editorFontSize}px; line-height:1em`"
	>
		{{ sampleText }}
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { settingsManager } from '../../services/settings-manager'
import TabBar from '../elements/TabBar.vue'
import { fontManager } from '../../global'

const emit = defineEmits(['close'])

const editorFontFamily = ref('')
const editorFontSize = ref(14)
const canSave = computed(
	() =>
		editorFontFamily.value !== settingsManager.editorFontFamily ||
		editorFontSize.value !== settingsManager.editorFontSize,
)

watch(editorFontFamily, () => {
	console.log(editorFontFamily.value)
})

const loadFonts = async () => {
	await fontManager.load()
}

onMounted(async () => {
	editorFontFamily.value = settingsManager.editorFontFamily
	editorFontSize.value = settingsManager.editorFontSize
	if (fontManager.hasPermission) {
		await loadFonts()
	}
})

const reset = async () => {
	document.body.style.fontSize = '16px'
	editorFontFamily.value = 'Consolas'
	editorFontSize.value = 14
	await save()
}

const save = async () => {
	settingsManager.editorFontFamily = editorFontFamily.value
	settingsManager.editorFontSize = editorFontSize.value
	var root = document.querySelector(':root') as HTMLElement
	root.style.setProperty('--font-editor', `'${editorFontFamily.value}', 'Consolas', 'Courier New', 'monospace'`)
	root.style.setProperty('--text-size-editor', `${editorFontSize.value}px`)
	// var root = document.querySelector(':root') as HTMLElement
	// root.style.setProperty('--text-size-base', `16px`)
	// root.style.setProperty('--text-size-menu', `16px`)
}

const sampleText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent elit augue,

auctor eu vulputate ac, fringilla non lacus. Nam ornare viverra ex id molestie. Duis tempus, neque vel posuere porta, dui odio venenatis ex, id vestibulum diam ipsum sit amet nisl.

- Nam pellentesque, erat ac feugiat aliquam,
- dui metus viverra nunc, eget condimentum magna lectus sit amet purus.
- In posuere dui ac justo dictum interdum. Nullam iaculis semper lacus

`
</script>
