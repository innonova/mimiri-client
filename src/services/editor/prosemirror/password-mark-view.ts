import type { ClipboardManager } from './code-block-action-handler'
import { COPY_SVG, EYE_SVG, EYE_OFF_SVG } from '../editor-icons'

export function createPasswordMarkViewFactory(
	clipboardManager: ClipboardManager,
	onCopyNotification: (top: number, left: number) => void,
) {
	return () => {
		const wrapper = document.createElement('span')
		wrapper.className = 'password-wrapper'

		const content = document.createElement('password')

		const buttons = document.createElement('span')
		buttons.className = 'password-buttons'
		buttons.setAttribute('contenteditable', 'false')

		const copyBtn = document.createElement('button')
		copyBtn.className = 'password-btn'
		copyBtn.title = 'Copy'
		copyBtn.innerHTML = COPY_SVG
		copyBtn.addEventListener('mousedown', e => {
			e.preventDefault()
			e.stopPropagation()
			clipboardManager.write(content.textContent || '')
			const wrapperRect = wrapper.getBoundingClientRect()
			const btnRect = copyBtn.getBoundingClientRect()
			// Place notification 80px left of the copy button, clamped to the
			// left edge of the editor so it never overflows into the sidebar.
			onCopyNotification(wrapperRect.top, Math.max(wrapperRect.left, btnRect.left - 80))
		})

		let visible = false
		const viewBtn = document.createElement('button')
		viewBtn.className = 'password-btn'
		viewBtn.title = 'Show'
		viewBtn.innerHTML = EYE_SVG
		viewBtn.addEventListener('mousedown', e => {
			e.preventDefault()
			e.stopPropagation()
			visible = !visible
			wrapper.classList.toggle('password-visible', visible)
			viewBtn.innerHTML = visible ? EYE_OFF_SVG : EYE_SVG
			viewBtn.title = visible ? 'Hide' : 'Show'
		})

		buttons.append(copyBtn, viewBtn)
		wrapper.append(content, buttons)

		// Pre-measure both masked and revealed widths after PM populates the content,
		// so minWidth is locked to the maximum before the user ever clicks.
		requestAnimationFrame(() => {
			const maskedWidth = wrapper.offsetWidth
			wrapper.classList.add('password-visible')
			const revealedWidth = wrapper.offsetWidth
			wrapper.classList.remove('password-visible')
			wrapper.style.minWidth = Math.max(maskedWidth, revealedWidth) + 'px'

			// offsetWidth works on visibility:hidden elements (unlike getBoundingClientRect).
			// If the buttons panel is wider than the wrapper, right-anchoring would push
			// it leftward past the text start — flip to left-anchored instead.
			if (buttons.offsetWidth > wrapper.offsetWidth) {
				buttons.style.right = 'auto'
				buttons.style.left = '0'
			}
		})

		return {
			dom: wrapper,
			contentDOM: content,
			ignoreMutation(mutation: { target: Node }) {
				return mutation.target === wrapper || buttons.contains(mutation.target)
			},
		}
	}
}
