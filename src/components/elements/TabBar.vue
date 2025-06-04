<template>
	<div class="flex select-none">
		<template v-for="item in items" :key="item">
			<div
				class="py-2 px-4 rounded-t-sm"
				:class="{
					'bg-info cursor-default': selected === item,
					'cursor-pointer': selected !== item,
				}"
				:data-testid="`settings-view-${item.toLowerCase().replace(/\s+/g, '-')}`"
				@click="tabClick(item)"
			>
				{{ item }}
			</div>
		</template>
	</div>
	<div class="bg-info min-h-2 h-2 mb-2 mr-2 rounded-b-sm rounded-r-sm"></div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
	items: string[]
}>()

const emit = defineEmits(['selected'])

const selected = ref('')

onMounted(() => {
	selected.value = props.items[0]
})

const tabClick = (item: string) => {
	selected.value = item
	emit('selected', item)
}
</script>
