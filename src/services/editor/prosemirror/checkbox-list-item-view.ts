import type { Node } from 'prosemirror-model'
import type { EditorView, NodeView } from 'prosemirror-view'

export class CheckboxListItemView implements NodeView {
	dom: HTMLElement
	contentDOM: HTMLElement
	private checkbox: HTMLInputElement | null = null

	constructor(
		private node: Node,
		private view: EditorView,
		private getPos: () => number | undefined,
	) {
		// Create the list item element
		const li = document.createElement('li')

		// If this is a task item, add the checkbox
		if (node.attrs.checked !== null) {
			li.dataset.itemType = 'task'
			li.dataset.checked = node.attrs.checked ? 'true' : 'false'

			// Create a container for the checkbox
			const checkboxContainer = document.createElement('span')
			checkboxContainer.className = 'checkbox-container'
			checkboxContainer.contentEditable = 'false'

			// Create the actual checkbox input
			this.checkbox = document.createElement('input')
			this.checkbox.type = 'checkbox'
			this.checkbox.checked = node.attrs.checked
			this.checkbox.className = 'task-checkbox'

			// Handle checkbox changes
			this.checkbox.addEventListener('change', this.handleCheckboxChange)

			checkboxContainer.appendChild(this.checkbox)
			li.appendChild(checkboxContainer)
		}

		// Create the content container
		this.contentDOM = document.createElement('div')
		this.contentDOM.className = 'list-item-content'
		li.appendChild(this.contentDOM)

		this.dom = li
	}

	private handleCheckboxChange = (event: Event) => {
		event.preventDefault()
		const pos = this.getPos()
		if (pos === undefined) {
			return
		}

		const checked = (event.target as HTMLInputElement).checked
		const tr = this.view.state.tr.setNodeMarkup(pos, null, {
			...this.node.attrs,
			checked,
		})
		this.view.dispatch(tr)
	}

	update(node: Node): boolean {
		// Only update if it's the same type of node
		if (node.type !== this.node.type) {
			return false
		}

		this.node = node

		// Update checkbox state if it exists
		if (this.checkbox && node.attrs.checked !== null) {
			this.checkbox.checked = node.attrs.checked
			this.dom.dataset.checked = node.attrs.checked ? 'true' : 'false'
		}

		return true
	}

	destroy() {
		// Clean up event listeners
		if (this.checkbox) {
			this.checkbox.removeEventListener('change', this.handleCheckboxChange)
		}
	}
}
