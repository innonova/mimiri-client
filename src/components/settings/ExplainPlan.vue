<template>
	<div class="flex flex-col h-full">
		<TabBar :items="[$t('settingsExplainPlan.tab')]" />
		<div class="overflow-y-auto pb-10">
			<div class="p-1">{{ $t('settingsExplainPlan.description') }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TabBar from '../elements/TabBar.vue'
</script>
