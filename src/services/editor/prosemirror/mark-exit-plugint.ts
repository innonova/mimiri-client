import { Plugin } from 'prosemirror-state'
import { ReplaceStep } from 'prosemirror-transform'

export const markExitPlugin = new Plugin({
	appendTransaction(transactions, oldState, newState) {
		const tr = newState.tr
		let modified = false

		transactions.forEach(transaction => {
			if (!transaction.docChanged) return

			const { $from } = newState.selection
			const marks = $from.marks()

			transaction.steps.forEach(step => {
				if (step instanceof ReplaceStep && step.slice) {
					let insertedText = ''
					step.slice.content.forEach(node => {
						if (node.isText) insertedText += node.text
					})

					if (insertedText === ' ' && marks.length > 0) {
						const pos = $from.pos

						// Check for double-space (exit marks)
						const before = newState.doc.textBetween(pos - 2, pos - 1)
						if (before === ' ') {
							marks.forEach(mark => {
								tr.removeMark(pos - 2, pos, mark)
								modified = true
							})
						}

						// Check for space at start of marked text (exit marks)
						// If this is the first char in the marked run
						const $pos = newState.doc.resolve(pos - 1)
						const beforeMarks = $pos.marks()
						const markJustStarted = marks.length > beforeMarks.length

						if (markJustStarted) {
							marks.forEach(mark => {
								tr.removeMark(pos - 1, pos, mark)
								modified = true
							})
						}
					}
				}
			})
		})

		return modified ? tr : null
	},
})
