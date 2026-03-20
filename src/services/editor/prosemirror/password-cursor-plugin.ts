import { Plugin } from 'prosemirror-state'
import { mimiriSchema } from './mimiri-schema'

export const passwordCursorPlugin = new Plugin({
	view() {
		return {
			update(view) {
				// Clear active state from all password wrappers
				view.dom.querySelectorAll('.password-wrapper.password-active').forEach(el => {
					el.classList.remove('password-active')
				})

				const { $from, $to } = view.state.selection
				const passwordMark = mimiriSchema.marks.password

				// Check if the cursor or selection is within a password mark
				const hasPasswordAtCursor = $from.marks().some(m => m.type === passwordMark)
				const hasPasswordInSelection =
					$from.pos !== $to.pos && view.state.doc.rangeHasMark($from.pos, $to.pos, passwordMark)

				if (!hasPasswordAtCursor && !hasPasswordInSelection) return

				// Walk up from the cursor's DOM position to find the wrapper element
				try {
					const domPos = view.domAtPos($from.pos)
					let node: HTMLElement | null =
						domPos.node instanceof HTMLElement ? domPos.node : (domPos.node.parentElement ?? null)
					while (node && node !== view.dom) {
						if (node.classList?.contains('password-wrapper')) {
							node.classList.add('password-active')
							return
						}
						node = node.parentElement
					}
				} catch {
					// domAtPos can occasionally throw at edge positions; ignore
				}
			},
		}
	},
})
