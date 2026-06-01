<template>
	<div class="flex flex-col h-full">
		<TabBar :items="[$t('settingsRecycleBin.tab')]" />
		<div class="overflow-y-auto pb-10">
			<div class="p-1">{{ $t('settingsRecycleBin.description') }}</div>
			<div class="mt-5 max-w-110 mr-2">
				<hr />
				<div class="w-full flex justify-between mt-2 gap-2">
					<button @click="scanForInconsistencies" class="primary">
						{{ $t('settingsRecycleBin.scanForInconsistencies') }}
					</button>
					<button
						:disabled="noteManager.tree.selectedNote()?.viewModel?.children.length === 0"
						@click="empty"
						class="primary"
					>
						{{ $t('settingsRecycleBin.emptyRecycleBin') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { $t, emptyRecycleBinDialog, inconsistencyDialog, infoDialog, noteManager } from '../../global'
import TabBar from '../elements/TabBar.vue'

const empty = () => {
	emptyRecycleBinDialog.value.show()
}

const scanForInconsistencies = async () => {
	if (await noteManager.checkForConsistency()) {
		inconsistencyDialog.value.show()
	} else {
		infoDialog.value.show(
			$t('settingsRecycleBin.scanForInconsistencies'),
			$t('settingsRecycleBin.noInconsistenciesFound'),
		)
	}
}
</script>
