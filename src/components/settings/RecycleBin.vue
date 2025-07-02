<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Recycle Bin']"></TabBar>
		<div class="overflow-y-auto pb-10">
			<div class="p-1">Permanently delete all items in the Recycle Bin</div>
			<div class="mt-5 max-w-110 mr-2">
				<hr />
				<div class="w-full flex justify-end mt-2 gap-2">
					<button
						:disabled="noteManager.tree.selectedNote?.viewModel?.children.length === 0"
						@click="empty"
						class="primary"
					>
						Empty Recycle Bin
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { emptyRecycleBinDialog, noteManager } from '../../global'
import TabBar from '../elements/TabBar.vue'

const empty = () => {
	emptyRecycleBinDialog.value.show()
}
</script>
