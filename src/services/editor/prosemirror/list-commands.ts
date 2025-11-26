import type { Node as ProseMirrorNode } from 'prosemirror-model'
import type { EditorState, Transaction } from 'prosemirror-state'
import { mimiriSchema } from './mimiri-schema'

export type ListType = 'checkbox' | 'bullet' | 'ordered'

interface ListItemAttrs {
	checked: boolean | null
	marker: string | null
}

interface BlockInfo {
	node: ProseMirrorNode
	indent: number
	text: string
}

interface DepthBlock extends BlockInfo {
	depth: number
}

/**
 * Get the target list node type and list item attributes for a given list type
 */
function getListTargets(listType: ListType) {
	const targetListNodeType = listType === 'ordered' ? mimiriSchema.nodes.ordered_list : mimiriSchema.nodes.bullet_list

	const targetListItemAttrs: ListItemAttrs =
		listType === 'checkbox'
			? { checked: false, marker: '-' }
			: { checked: null, marker: listType === 'bullet' ? '-' : null }

	return { targetListNodeType, targetListItemAttrs }
}

/**
 * Check if the current list matches the target list type
 * For checkbox lists, we check if list items have checked !== null
 * For bullet/ordered, we check the list node type
 */
function isMatchingListType(listNode: ProseMirrorNode, listType: ListType): boolean {
	if (listType === 'ordered') {
		return listNode.type === mimiriSchema.nodes.ordered_list
	}

	// For bullet and checkbox, both use bullet_list node type
	if (listNode.type !== mimiriSchema.nodes.bullet_list) {
		return false
	}

	// Check if it's a checkbox list by looking at the first list item
	let hasCheckbox = false
	listNode.forEach(child => {
		if (child.type === mimiriSchema.nodes.list_item && child.attrs.checked !== null) {
			hasCheckbox = true
		}
	})

	if (listType === 'checkbox') {
		return hasCheckbox
	} else {
		// bullet type
		return !hasCheckbox
	}
}

/**
 * Unwrap a list, converting list items back to paragraphs
 * Preserves indentation by adding leading whitespace based on nesting depth
 */
function unwrapList(state: EditorState, listDepth: number, listPos: number): Transaction {
	const $from = state.selection.$from
	const listNode = $from.node(listDepth)
	const tr = state.tr

	// Collect all paragraphs from list items with their depth for indentation
	const paragraphs: ProseMirrorNode[] = []

	const collectParagraphs = (node: ProseMirrorNode, depth: number) => {
		node.forEach(child => {
			if (child.type === mimiriSchema.nodes.list_item) {
				// Get the first child (paragraph) from the list item
				child.forEach(itemChild => {
					if (itemChild.type === mimiriSchema.nodes.paragraph) {
						// Add indentation based on depth
						if (depth > 0) {
							const indent = '\t'.repeat(depth)
							const textContent = itemChild.textContent
							const newText = indent + textContent
							const textNode = newText ? mimiriSchema.text(newText) : null
							const indentedParagraph = mimiriSchema.nodes.paragraph.create(null, textNode ? [textNode] : [])
							paragraphs.push(indentedParagraph)
						} else {
							paragraphs.push(itemChild)
						}
					} else if (
						itemChild.type === mimiriSchema.nodes.bullet_list ||
						itemChild.type === mimiriSchema.nodes.ordered_list
					) {
						// Recursively collect from nested lists with increased depth
						collectParagraphs(itemChild, depth + 1)
					}
				})
			}
		})
	}

	collectParagraphs(listNode, 0)

	// If no paragraphs found, create an empty one
	if (paragraphs.length === 0) {
		paragraphs.push(mimiriSchema.nodes.paragraph.create())
	}

	// Replace the list with the collected paragraphs
	const listEnd = listPos + listNode.nodeSize
	tr.replaceWith(listPos, listEnd, paragraphs)

	return tr
}

/**
 * Recursively collect all list and list item positions within a node
 */
function collectListNodes(
	node: ProseMirrorNode,
	startPos: number,
	listPositions: number[],
	listItemPositions: number[],
) {
	node.forEach((child, childOffset) => {
		const childPos = startPos + 1 + childOffset
		if (child.type === mimiriSchema.nodes.bullet_list || child.type === mimiriSchema.nodes.ordered_list) {
			listPositions.push(childPos)
		}
		if (child.type === mimiriSchema.nodes.list_item) {
			listItemPositions.push(childPos)
		}
		// Recurse into children
		if (child.childCount > 0) {
			collectListNodes(child, childPos, listPositions, listItemPositions)
		}
	})
}
/**
 * Convert an existing list to a different list type
 */
function convertExistingList(
	state: EditorState,
	listDepth: number,
	listPos: number,
	targetListNodeType: typeof mimiriSchema.nodes.bullet_list | typeof mimiriSchema.nodes.ordered_list,
	targetListItemAttrs: ListItemAttrs,
): Transaction {
	const $from = state.selection.$from
	const targetListNode = $from.node(listDepth)
	const tr = state.tr

	// Collect all list positions that should be converted (this list and nested lists)
	const listPositions: number[] = [listPos]
	const listItemPositions: number[] = []

	collectListNodes(targetListNode, listPos, listPositions, listItemPositions)

	// Update all lists to the target type (in reverse order to maintain positions)
	listPositions.sort((a, b) => b - a)
	for (const pos of listPositions) {
		const mappedPos = tr.mapping.map(pos)
		const node = tr.doc.nodeAt(mappedPos)
		if (node && (node.type === mimiriSchema.nodes.bullet_list || node.type === mimiriSchema.nodes.ordered_list)) {
			if (node.type !== targetListNodeType) {
				tr.setNodeMarkup(mappedPos, targetListNodeType)
			}
		}
	}

	// Update all list items' attributes (in reverse order to maintain positions)
	listItemPositions.sort((a, b) => b - a)
	for (const itemPos of listItemPositions) {
		const mappedPos = tr.mapping.map(itemPos)
		const node = tr.doc.nodeAt(mappedPos)
		if (node && node.type === mimiriSchema.nodes.list_item) {
			// Preserve indent while changing checked/marker
			const currentAttrs = node.attrs
			const newChecked = targetListItemAttrs.checked
			const newMarker = targetListItemAttrs.marker ?? currentAttrs.marker
			const newAttrs = {
				indent: currentAttrs.indent,
				checked: newChecked,
				marker: newMarker,
			}
			const attrsChanged = currentAttrs.checked !== newChecked || currentAttrs.marker !== newMarker
			if (attrsChanged) {
				tr.setNodeMarkup(mappedPos, undefined, newAttrs)
			}
		}
	}

	return tr
}

/**
 * Build a nested list structure from blocks with indentation info
 */
function buildNestedList(
	blocks: BlockInfo[],
	listNodeType: typeof mimiriSchema.nodes.bullet_list | typeof mimiriSchema.nodes.ordered_list,
	listItemAttrs: ListItemAttrs,
): ProseMirrorNode {
	// Find the minimum indentation level to use as base
	const minIndent = Math.min(...blocks.map(b => b.indent))

	// Normalize indentation relative to minimum
	const normalizedBlocks = blocks.map(b => ({
		...b,
		indent: b.indent - minIndent,
	}))

	// Group blocks into indent levels (0, 2, 4, etc. -> 0, 1, 2)
	// Find all unique indent levels and map them to depths
	const uniqueIndents = [...new Set(normalizedBlocks.map(b => b.indent))].sort((a, b) => a - b)
	const indentToDepth = new Map<number, number>()
	uniqueIndents.forEach((indent, index) => {
		indentToDepth.set(indent, index)
	})

	// Convert blocks to use depth instead of raw indent
	const depthBlocks: DepthBlock[] = normalizedBlocks.map(b => ({
		...b,
		depth: indentToDepth.get(b.indent) ?? 0,
	}))

	// Build the nested structure recursively
	return buildListFromDepthBlocks(depthBlocks, 0, 0, depthBlocks.length, listNodeType, listItemAttrs)
}

/**
 * Recursively build list nodes from blocks with depth info
 */
function buildListFromDepthBlocks(
	blocks: DepthBlock[],
	currentDepth: number,
	startIdx: number,
	endIdx: number,
	listNodeType: typeof mimiriSchema.nodes.bullet_list | typeof mimiriSchema.nodes.ordered_list,
	listItemAttrs: ListItemAttrs,
): ProseMirrorNode {
	const listItems: ProseMirrorNode[] = []
	let i = startIdx

	while (i < endIdx) {
		const block = blocks[i]

		if (block.depth === currentDepth) {
			// This block is at the current depth - create a list item
			// Create paragraph with the text content (stripped of leading whitespace)
			const textNode = block.text ? mimiriSchema.text(block.text) : null
			const paragraph = mimiriSchema.nodes.paragraph.create(null, textNode ? [textNode] : [])

			// Check if the next blocks are nested (deeper depth)
			let nestedEndIdx = i + 1
			while (nestedEndIdx < endIdx && blocks[nestedEndIdx].depth > currentDepth) {
				nestedEndIdx++
			}

			if (nestedEndIdx > i + 1) {
				// There are nested items - create a nested list
				const nestedList = buildListFromDepthBlocks(
					blocks,
					currentDepth + 1,
					i + 1,
					nestedEndIdx,
					listNodeType,
					listItemAttrs,
				)
				const listItem = mimiriSchema.nodes.list_item.create(listItemAttrs, [paragraph, nestedList])
				listItems.push(listItem)
				i = nestedEndIdx
			} else {
				// No nested items
				const listItem = mimiriSchema.nodes.list_item.create(listItemAttrs, paragraph)
				listItems.push(listItem)
				i++
			}
		} else if (block.depth > currentDepth) {
			// This shouldn't happen if we're processing correctly, but handle it
			// Find the range of deeper blocks and process them
			let nestedEndIdx = i
			while (nestedEndIdx < endIdx && blocks[nestedEndIdx].depth > currentDepth) {
				nestedEndIdx++
			}

			// Create a list item with just the nested content
			const nestedList = buildListFromDepthBlocks(
				blocks,
				currentDepth + 1,
				i,
				nestedEndIdx,
				listNodeType,
				listItemAttrs,
			)
			const emptyParagraph = mimiriSchema.nodes.paragraph.create()
			const listItem = mimiriSchema.nodes.list_item.create(listItemAttrs, [emptyParagraph, nestedList])
			listItems.push(listItem)
			i = nestedEndIdx
		} else {
			// Block depth is less than current - we're done at this level
			break
		}
	}

	return listNodeType.create(null, listItems)
}

/**
 * Create a new list from the current selection
 */
function createNewList(
	state: EditorState,
	dispatch: (tr: Transaction) => void,
	targetListNodeType: typeof mimiriSchema.nodes.bullet_list | typeof mimiriSchema.nodes.ordered_list,
	targetListItemAttrs: ListItemAttrs,
) {
	const { selection } = state
	const { $from, $to } = selection
	const startPos = $from.before($from.depth)
	const endPos = $to.after($to.depth)

	// Collect blocks with their indentation info
	const blocks: BlockInfo[] = []

	state.doc.nodesBetween(startPos, endPos, (node, pos) => {
		if (node.isTextblock && pos >= startPos && pos < endPos) {
			const textContent = node.textContent
			// Detect leading whitespace as indentation
			const match = /^(\s*)(.*)$/.exec(textContent)
			const indentStr = match ? match[1] : ''
			const content = match ? match[2] : textContent

			// Calculate indent depth (tabs = 2, spaces = 1)
			let indentDepth = 0
			for (const char of indentStr) {
				indentDepth += char === '\t' ? 2 : 1
			}

			blocks.push({
				node,
				indent: indentDepth,
				text: content,
			})
			return false // Don't descend into this node
		}
	})

	if (blocks.length === 0) {
		// Empty selection - create empty list item
		const paragraph = mimiriSchema.nodes.paragraph.create()
		const listItem = mimiriSchema.nodes.list_item.create(targetListItemAttrs, paragraph)
		const listNode = targetListNodeType.create(null, [listItem])
		const tr = state.tr.replaceWith(startPos, endPos, listNode)
		dispatch(tr)
		return
	}

	// Build nested list structure based on indentation
	const rootList = buildNestedList(blocks, targetListNodeType, targetListItemAttrs)
	const tr = state.tr.replaceWith(startPos, endPos, rootList)
	dispatch(tr)
}

/**
 * Insert or convert a list of the specified type
 */
export function insertList(state: EditorState, dispatch: (tr: Transaction) => void, listType: ListType) {
	const { selection } = state
	const { $from } = selection

	const { targetListNodeType, targetListItemAttrs } = getListTargets(listType)

	// Find the innermost list containing the cursor
	// We want to convert this list and its children, but not parent lists
	let listDepth = -1
	let listPos = -1
	// Iterate from shallow to deep and keep updating (last match wins = innermost)
	for (let d = 1; d <= $from.depth; d++) {
		const node = $from.node(d)
		if (node.type === mimiriSchema.nodes.bullet_list || node.type === mimiriSchema.nodes.ordered_list) {
			listDepth = d
			listPos = $from.before(d)
		}
	}

	if (listDepth > 0) {
		// Already in a list - check if it's the same type (toggle off) or different (convert)
		const currentListNode = $from.node(listDepth)

		if (isMatchingListType(currentListNode, listType)) {
			// Same list type - unwrap/remove the list
			const tr = unwrapList(state, listDepth, listPos)
			dispatch(tr)
		} else {
			// Different list type - convert
			const tr = convertExistingList(state, listDepth, listPos, targetListNodeType, targetListItemAttrs)
			dispatch(tr)
		}
	} else {
		// Not in a list - wrap content in a new list
		createNewList(state, dispatch, targetListNodeType, targetListItemAttrs)
	}
}
