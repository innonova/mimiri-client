<template>
	<dialog
		class="min-w-80 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="export-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-4">
			<DialogTitle data-testid="export-dialog-title">{{ $t('exportDialog.title') }}</DialogTitle>

			<main class="px-3 pb-1 leading-5">
				<!-- ── Idle: pick options ─────────────────────────────────── -->
				<template v-if="phase === 'idle'">
					<p class="mb-4 text-sm" data-testid="export-dialog-scope">{{ scopeText }}</p>
					<div class="flex flex-col gap-2">
						<label class="flex items-center gap-2 cursor-pointer" data-testid="export-dialog-option-folder">
							<input type="radio" v-model="exportMode" value="folder" class="accent-primary" />
							<span>{{ $t('exportDialog.folderOption') }}</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer" data-testid="export-dialog-option-zip">
							<input type="radio" v-model="exportMode" value="zip" class="accent-primary" />
							<span>{{ $t('exportDialog.zipOption') }}</span>
						</label>
					</div>
					<p class="mt-4 text-xs opacity-70">
						{{ $t('exportDialog.chooseLocationHint') }}
					</p>
				</template>

				<!-- ── Exporting (progress) ──────────────────────────────── -->
				<template v-else-if="phase === 'exporting'">
					<div class="flex flex-col gap-3 py-2">
						<span class="text-sm text-center" data-testid="export-dialog-exporting-text">
							{{ $t('exportDialog.exporting') }}
						</span>
						<div class="relative h-[30px] border border-solid border-dialog-border">
							<div
								class="h-[30px] bg-progress-indicator transition-all duration-300"
								:style="{ width: progressPercent + '%' }"
							/>
							<div
								class="absolute h-full w-full top-0 left-0 text-center leading-[27px] text-sm font-medium"
								data-testid="export-dialog-progress"
							>
								{{ progressPercent }}%
							</div>
						</div>
						<span class="text-xs text-center opacity-70" data-testid="export-dialog-note-count">
							{{ $t('exportDialog.notesProcessed', { current: noteCount, total: totalNotes }) }}
						</span>
					</div>
				</template>

				<!-- ── Success ────────────────────────────────────────────── -->
				<template v-else-if="phase === 'success'">
					<p class="text-sm" data-testid="export-dialog-success-text">
						{{ $t('exportDialog.success', { count: noteCount }) }}
					</p>
				</template>
			</main>

			<footer class="flex mobile:justify-center gap-2 pr-2 pb-2 pl-2" :class="footerClass">
				<template v-if="phase === 'idle'">
					<button class="secondary" @click="close" data-testid="export-dialog-cancel">
						{{ $t('exportDialog.cancel') }}
					</button>
					<button class="primary" @click="startExport" data-testid="export-dialog-start">
						{{ $t('exportDialog.start') }}
					</button>
				</template>
				<template v-else-if="phase === 'success'">
					<button class="primary" @click="close" data-testid="export-dialog-ok">
						{{ $t('exportDialog.ok') }}
					</button>
				</template>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DialogTitle from '../elements/DialogTitle.vue'
import { noteManager, $t } from '../../global'
import type { MimerNote } from '../../services/types/mimer-note'
import type { ExportedFile } from '../../services/storage/note-exporter'

type ExportMode = 'folder' | 'zip'
type Phase = 'idle' | 'exporting' | 'success'

interface ShowOptions {
	/** 'all' = export every note; 'subtree' = export a single note + its children */
	mode: 'all' | 'subtree'
	note?: MimerNote
}

const dialog = ref<HTMLDialogElement | null>(null)
const isOpen = ref(false)
const phase = ref<Phase>('idle')
const exportMode = ref<ExportMode>('folder')
const noteCount = ref(0)
const totalNotes = ref(0)
const progressPercent = ref(0)
const scopeText = ref('')

let currentMode: 'all' | 'subtree' = 'all'
let currentNote: MimerNote | undefined

const footerClass = computed(() => {
	if (phase.value === 'idle') return 'justify-between'
	if (phase.value === 'success') return 'justify-end'
	return 'justify-end'
})

const show = (options: ShowOptions) => {
	currentMode = options.mode
	currentNote = options.note
	scopeText.value =
		options.mode === 'subtree' && options.note
			? $t('exportDialog.exportSubtree', { title: options.note.title ?? 'Untitled' })
			: $t('exportDialog.exportAll')
	phase.value = 'idle'
	exportMode.value = 'folder'
	noteCount.value = 0
	totalNotes.value = 0
	progressPercent.value = 0
	isOpen.value = true
	dialog.value?.showModal()
}

const close = () => {
	dialog.value?.close()
}

const startExport = async () => {
	// ── Step 1: Show OS picker to choose destination ────────────────────
	const dialogTitle = $t('exportDialog.title')
	let destinationChosen: boolean

	if (exportMode.value === 'zip') {
		// For ZIP: we need to collect files first to create the archive, then save it
		// But we'll ask where to save after collection
		destinationChosen = true // Will prompt after collection
	} else {
		// For folder: we can't pre-prompt because saveFolder API doesn't support it
		// The destination will be chosen during the save step
		destinationChosen = true
	}

	if (!destinationChosen) {
		return
	}

	// ── Step 2: Collect & save files with progress ──────────────────────
	phase.value = 'exporting'
	noteCount.value = 0
	totalNotes.value = 0
	progressPercent.value = 0

	let files: ExportedFile[]
	try {
		if (currentMode === 'subtree' && currentNote) {
			files = await noteManager.operations.collectSubtreeFiles(currentNote, count => {
				noteCount.value = count
				// Progress: 0-80% for collection
				progressPercent.value = Math.min(80, count * 5)
			})
		} else {
			files = await noteManager.operations.collectAllFiles(count => {
				noteCount.value = count
				// Progress: 0-80% for collection (estimate)
				progressPercent.value = Math.min(80, Math.floor((count / 10) * 5))
			})
		}
	} catch {
		phase.value = 'idle'
		return
	}

	const fileCount = files.filter(f => !f.isFolder).length
	noteCount.value = fileCount
	totalNotes.value = fileCount
	progressPercent.value = 80

	// ── Step 3: Save to chosen destination ──────────────────────────────
	progressPercent.value = 85

	let saved: boolean
	try {
		if (exportMode.value === 'zip') {
			const zipName =
				currentMode === 'subtree' && currentNote
					? `${currentNote.title ?? 'Untitled'} Export.zip`
					: 'Mimiri Notes Export.zip'
			progressPercent.value = 90
			saved = await noteManager.operations.saveExportToZip(files, zipName, dialogTitle)
		} else {
			progressPercent.value = 90
			saved = await noteManager.operations.saveExportToFolder(files, dialogTitle)
		}
	} catch {
		phase.value = 'idle'
		return
	}

	if (!saved) {
		// User cancelled the OS file/folder picker → go back to options
		phase.value = 'idle'
		return
	}

	progressPercent.value = 100

	// ── Step 4: Success ───────────────────────────────────────────────────
	phase.value = 'success'
}

defineExpose({ show })
</script>
