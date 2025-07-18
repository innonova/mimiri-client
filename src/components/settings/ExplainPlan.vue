<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Plan']" />
		<div class="overflow-y-auto pb-10">
			<div class="p-1">Manage your subscription plan and billing information</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TabBar from '../elements/TabBar.vue'
</script>
