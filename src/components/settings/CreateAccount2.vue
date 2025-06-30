<template>
	<div class="flex flex-col items-left max-w-200">
		<label class="border m-1 pl-2 py-3 flex items-center gap-1">
			<input type="radio" name="accountType" v-model="accountType" value="cloud" />Cloud Account
		</label>
		<div v-if="accountType === 'cloud'" class="pl-2 mb-5 mt-1">
			<p>Cloud account selected</p>
		</div>
		<label class="border m-1 pl-2 py-3 flex items-center gap-1">
			<input type="radio" name="accountType" v-model="accountType" value="local" />Local Account
		</label>
		<div v-if="accountType === 'local'" class="pl-2 mb-5 mt-1">
			<p>Local account selected</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const accountType = ref('cloud')
</script>
