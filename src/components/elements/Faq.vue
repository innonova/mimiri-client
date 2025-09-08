<template>
	<div class="flex flex-col">
		<div
			v-for="(item, index) in faqItems"
			:key="index"
			class="border-0 border-b border-border last:border-b-0 flex flex-col"
		>
			<button
				type="button"
				@click="toggleItem(index)"
				class="py-3 transition-colors duration-200 flex justify-between items-center cursor-pointer"
				:aria-expanded="openItems.has(index)"
				:aria-controls="`faq-answer-${index}`"
			>
				<span class="font-display text-size-base text-text">{{ item.question }}</span>
				<svg
					class="w-4 h-4 text-text-secondary transition-transform duration-200 flex-shrink-0 ml-4"
					:class="{ 'rotate-180': openItems.has(index) }"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			<div
				:id="`faq-answer-${index}`"
				class="overflow-hidden transition-all duration-200 ease-in-out"
				:class="openItems.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'"
			>
				<div class="pb-4 max-w-150 text-text-secondary pt-1.5 pr-10">
					<div class="font-display text-size-base whitespace-pre-line leading-5">
						{{ item.answer }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface FaqItem {
	question: string
	answer: string
}

const props = defineProps<{
	items?: FaqItem[]
}>()

const openItems = ref(new Set<number>())

const faqItems = ref<FaqItem[]>(props.items || [])

const toggleItem = (index: number) => {
	if (openItems.value.has(index)) {
		openItems.value.delete(index)
	} else {
		openItems.value.add(index)
	}
}
</script>
