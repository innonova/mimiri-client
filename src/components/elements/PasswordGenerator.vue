<template>
	<div>
		<div class="mt-1">
			<select v-model="preset" class="w-full p-1">
				<option v-if="mode === 'mimiri'" value="0">Recommended Settings</option>
				<option v-if="mode === 'mimiri'" value="1">Nudge it up a bit</option>
				<option v-if="mode === 'mimiri'" value="2">My memory isn't so good</option>
				<option v-if="mode === 'mimiri'" value="3">I'm a target</option>
				<option v-if="mode === 'mimiri'" value="4">I cosplay as Mata Hari</option>

				<option v-if="mode === '3rdp'" value="5">Recommended Settings</option>
				<option v-if="mode === '3rdp'" value="6">Nudge it up a bit</option>
				<option v-if="mode === '3rdp'" value="7">Make it easier to type</option>
				<option v-if="mode === '3rdp'" value="8">I'm a target</option>
				<option v-if="mode === '3rdp'" value="9">I cosplay as Mata Hari</option>

				<option value="100">Custom</option>
			</select>
		</div>
		<div v-if="showDetails || custom" class="mb-3">
			<div class="mt-1">
				<label>
					<input type="checkbox" v-model="includeLowerCase" :disabled="!custom" class="mr-1 relative top-0.5" />
					Include lower case <code>a-z</code>
				</label>
			</div>
			<div class="mt-1">
				<label>
					<input type="checkbox" v-model="includeUpperCase" :disabled="!custom" class="mr-1 relative top-0.5" />
					Include upper case <code>A-Z</code>
				</label>
			</div>
			<div class="mt-1">
				<label>
					<input type="checkbox" v-model="includeNumbers" :disabled="!custom" class="mr-1 relative top-0.5" />
					Include numbers <code>0-9</code>
				</label>
			</div>
			<div class="mt-1">
				<label>
					<input type="checkbox" v-model="includeFriendlySymbols" :disabled="!custom" class="mr-1 relative top-0.5" />
					Include friendly symbols <code>{{ generator.friendlySymbols }}</code>
				</label>
			</div>
			<div class="mt-1">
				<label>
					<input type="checkbox" v-model="includeExtendedSymbols" :disabled="!custom" class="mr-1 relative top-0.5" />
					Include extended symbols <code>{{ generator.extendedSymbols }}</code>
				</label>
			</div>
			<div class="mt-1">
				<label>
					<input type="checkbox" v-model="includeDifficultSymbols" :disabled="!custom" class="mr-1 relative top-0.5" />
					Include difficult symbols <code>{{ generator.difficultSymbols }}</code>
				</label>
			</div>
			<div class="mt-1">
				<label>
					<input
						type="checkbox"
						v-model="includeOneSymbol"
						:disabled="!custom || noSymbolsSelected"
						class="mr-1 relative top-0.5"
					/>
					Include exactly 1 Symbol
				</label>
			</div>
			<div class="mt-1">
				Number of characters
				<select v-model="characterCount" :disabled="!custom">
					<option value="7">7</option>
					<option value="8">8</option>
					<option value="9">9</option>
					<option value="10">10</option>
					<option value="11">11</option>
					<option value="12">12</option>
					<option value="13">13</option>
					<option value="14">14</option>
					<option value="15">15</option>
					<option value="16">16</option>
				</select>
			</div>
			<div v-if="mode === 'mimiri'">
				Work factor (iterations):
				<select v-model="iterations" :disabled="!custom">
					<option value="1000000">1M ({{ time1M }}) (default)</option>
					<option value="2000000">2M ({{ time2M }})</option>
					<option value="10000000">10M ({{ time10M }})</option>
					<option value="20000000">20M ({{ time20M }})</option>
				</select>
			</div>
			<div class="mt-2">
				<i
					>Possible Combinations: 10<sup>{{ formatPermutations(complexity.permutations) }}</sup></i
				>
			</div>
		</div>
		<div v-if="!custom" class="flex justify-between mt-1.5 px-1">
			<div v-if="!showDetails && props.mode === 'mimiri'">
				Time to log in:
				<span v-if="iterations === 1000000">{{ time1M }}</span>
				<span v-if="iterations === 2000000">{{ time2M }}</span>
				<span v-if="iterations === 10000000">{{ time10M }}</span>
				<span v-if="iterations === 20000000">{{ time20M }}</span>
			</div>
			<div v-if="showDetails || props.mode !== 'mimiri'"></div>
			<div class="underline cursor-pointer" @click="toggleDetails">
				<span v-if="!showDetails"></span>
				<span v-if="showDetails">hide</span>
				details
			</div>
		</div>
		<div v-if="props.mode === 'mimiri'" class="info mt-4">
			<div class="mt-1 mb-1.5 font-bold">How likely to be cracked in case of:</div>
			<div class="mt-1 pl-1 flex justify-between w-64">
				<div>Large scale breach:</div>
				{{ breachLikelyHood }}
			</div>
			<div class="mt-2 pl-1 flex justify-between w-64">
				<div>Targeted attack:</div>
				{{ targetedLikelyHood }}
			</div>
			<div v-if="showInvestmentDetails || custom">
				<span v-if="props.mode === 'mimiri'">
					<div class="mt-4 mb-1.5 font-bold">Investment required to crack in less than:</div>
					<div class="mt-1 pl-1">1 year: {{ formatCurrency(complexity.year) }}</div>
					<div class="mt-2 pl-1">1 month: {{ formatCurrency(complexity.month) }}</div>
					<div class="mt-2 pl-1">1 week: {{ formatCurrency(complexity.week) }}</div>
				</span>
			</div>
			<div v-if="!custom" class="flex justify-end mt-1.5 px-1">
				<div class="underline cursor-pointer" @click="toggleInvestmentDetails">
					<span v-if="!showInvestmentDetails"></span>
					<span v-if="showInvestmentDetails">hide</span>
					details
				</div>
			</div>
		</div>
		<div v-if="props.mode === '3rdp'" class="info mt-4 rounded-sm">
			<div class="mb-1.5 font-bold">How likely to be cracked in case of:</div>
			<div class="mt-1 pl-1 flex justify-between w-76">
				<div>Online attack:</div>
				not happening
			</div>
			<div class="mt-2 pl-1 flex justify-between w-76">
				<div>Data breach:</div>
				{{ breachLikelyHood }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { PasswordGenerator, passwordTimeFactor, type PasswordComplexity } from '../../services/password-generator'
import { passwordHasher } from '../../services/password-hasher'
import { DEFAULT_PASSWORD_ALGORITHM, MimerClient } from '../../services/mimer-client'
import { SymmetricCrypt } from '../../services/symmetric-crypt'
const verificationInProgress = ref(false)
const preset = ref(0)
const custom = ref(false)
const iterations = ref(MimerClient.DEFAULT_ITERATIONS)
const characterCount = ref(8)
const includeLowerCase = ref(true)
const includeUpperCase = ref(true)
const includeNumbers = ref(true)
const includeFriendlySymbols = ref(true)
const includeExtendedSymbols = ref(false)
const includeDifficultSymbols = ref(false)
const includeOneSymbol = ref(true)
const noSymbolsSelected = ref(false)
const breachLikelyHood = ref('unknown')
const targetedLikelyHood = ref('unknown')
const password = ref('')
const verificationText = ref('')
const timeElapsed = ref('')
const verificationResult = ref('')
const showDetails = ref(false)
const showInvestmentDetails = ref(false)
const time1M = computed(() => `~${passwordTimeFactor.time1M}s`)
const time2M = computed(() => `~${passwordTimeFactor.time2M}s`)
const time10M = computed(() => `~${passwordTimeFactor.time10M}s`)
const time20M = computed(() => `~${passwordTimeFactor.time20M}s`)

const emit = defineEmits(['password'])

const props = defineProps<{
	mode: string
}>()

const toggleDetails = () => {
	showDetails.value = !showDetails.value
}

const toggleInvestmentDetails = () => {
	showInvestmentDetails.value = !showInvestmentDetails.value
}

const complexity = ref<PasswordComplexity>({
	permutations: 0,
	year: 0,
	month: 0,
	week: 0,
	hmacDay: 0,
	hmacYear: 0,
})

const generator = new PasswordGenerator()

const presets = [
	{
		characters: 8,
		iterations: 1000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 9,
		iterations: 2000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 7,
		iterations: 2000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 10,
		iterations: 2000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 12,
		iterations: 10000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: true,
		difficultSymbols: false,
		oneSymbol: false,
	},

	{
		characters: 10,
		iterations: 1000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 11,
		iterations: 2000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 9,
		iterations: 2000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 13,
		iterations: 2000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: false,
		difficultSymbols: false,
		oneSymbol: true,
	},
	{
		characters: 14,
		iterations: 10000000,
		lower: true,
		upper: true,
		numbers: true,
		friendlySymbols: true,
		extendedSymbols: true,
		difficultSymbols: false,
		oneSymbol: false,
	},
]

const loadPreset = () => {
	const index = preset.value
	if (index >= presets.length) {
		custom.value = true
		return
	}
	custom.value = false
	const selectedPreset = presets[index]
	characterCount.value = selectedPreset.characters
	iterations.value = selectedPreset.iterations
	includeLowerCase.value = selectedPreset.lower
	includeUpperCase.value = selectedPreset.upper
	includeNumbers.value = selectedPreset.numbers
	includeFriendlySymbols.value = selectedPreset.friendlySymbols
	includeExtendedSymbols.value = selectedPreset.extendedSymbols
	includeDifficultSymbols.value = selectedPreset.difficultSymbols
	includeOneSymbol.value = selectedPreset.oneSymbol
}

watch(preset, () => {
	loadPreset()
})

const million = Math.pow(10, 6)
const billion = Math.pow(10, 9)
const trillion = Math.pow(10, 12)
const quadrillion = Math.pow(10, 15)
const quintillion = Math.pow(10, 18)
const sextillion = Math.pow(10, 21)
const septillion = Math.pow(10, 24)
const octillion = Math.pow(10, 27)

const formatCurrency = (value: number) => {
	if (value < 1) {
		return `less than 1 USD`
	}
	if (value > octillion) {
		return `${Math.round(value / octillion)} octillion USD`
	}
	if (value > septillion) {
		return `${Math.round(value / septillion)} septillion USD`
	}
	if (value > sextillion) {
		return `${Math.round(value / sextillion)} sextillion USD`
	}
	if (value > quintillion) {
		return `${Math.round(value / quintillion)} quintillion USD`
	}
	if (value > quadrillion) {
		return `${Math.round(value / quadrillion)} quadrillion USD`
	}
	if (value > trillion) {
		return `${Math.round(value / trillion)} trillion USD`
	}
	if (value > billion) {
		return `${Math.round(value / billion)} billion USD`
	}
	if (value > 10 * million) {
		return `${Math.round(value / million)} million USD`
	}
	if (value > million) {
		return `${Math.round((value * 10) / million) / 10} million USD`
	}

	let result = ''
	let input = `${value}`
	while (input.length > 3) {
		result = input.substring(input.length - 3, input.length) + (result.length > 0 ? "'" : '') + result
		input = input.substring(0, input.length - 3)
	}
	if (input.length > 0) {
		result = input + (result.length > 0 ? "'" : '') + result
	}
	return result + ' USD'
}

const formatPermutations = (value: number) => {
	const digits = Math.floor(Math.log10(value)) + 1
	return `${digits}`
}

const calculateLikelyHood = (costYear, investment) => {
	const factor = costYear / investment
	if (factor > 100) {
		return 'not happening'
	}
	if (factor > 1) {
		return 'very unlikely'
	}
	if (factor < 0.01) {
		return 'certainty'
	}
	if (factor < 0.1) {
		return 'likely'
	}
	if (factor < 1) {
		return 'plausible'
	}
	return 'unknown'
}

onMounted(() => {
	preset.value = props.mode === 'mimiri' ? 0 : 5
	loadPreset()
})

watchEffect(async () => {
	noSymbolsSelected.value =
		!includeFriendlySymbols.value && !includeExtendedSymbols.value && !includeDifficultSymbols.value
	if (noSymbolsSelected.value) {
		includeOneSymbol.value = false
	}
	generator.setOptions({
		characters: characterCount.value,
		iterations: iterations.value,
		lower: includeLowerCase.value,
		upper: includeUpperCase.value,
		numbers: includeNumbers.value,
		friendlySymbols: includeFriendlySymbols.value,
		extendedSymbols: includeExtendedSymbols.value,
		difficultSymbols: includeDifficultSymbols.value,
		oneSymbol: includeOneSymbol.value,
	})
	complexity.value = generator.calculateComplexity()
	if (props.mode === 'mimiri') {
		breachLikelyHood.value = calculateLikelyHood(complexity.value.year, 10)
		targetedLikelyHood.value = calculateLikelyHood(complexity.value.year, 1000000)
	} else {
		breachLikelyHood.value = calculateLikelyHood(complexity.value.hmacYear, 10)
		targetedLikelyHood.value = calculateLikelyHood(complexity.value.hmacYear, 100000)
	}
	generator.generate().then(pwd => {
		password.value = pwd
		emit('password', pwd, iterations.value)
	})
})

const regeneratePassword = () => {
	generator.generate().then(pwd => {
		password.value = pwd
		emit('password', pwd, iterations.value)
	})
}

const verify = async () => {
	const start = performance.now()
	const correct = password.value
	const underTest = verificationText.value
	verificationResult.value = ''
	verificationInProgress.value = true
	const interval = setInterval(() => {
		const value = Math.round((performance.now() - start) / 100) / 10
		if (Math.floor(value) === value) {
			timeElapsed.value = `${value}.0 s`
		} else {
			timeElapsed.value = `${value} s`
		}
	}, 100)

	await passwordHasher.hashPassword(
		verificationText.value ?? '',
		'00ff',
		DEFAULT_PASSWORD_ALGORITHM,
		generator.options.iterations,
	)

	await SymmetricCrypt.fromPassword(
		SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
		verificationText.value ?? '',
		'00ff',
		generator.options.iterations,
	)

	verificationInProgress.value = false
	if (correct === underTest) {
		verificationResult.value = 'Matches'
	} else {
		verificationResult.value = 'Does not match'
	}

	clearInterval(interval)
}

defineExpose({
	regeneratePassword,
	verify,
})
</script>
