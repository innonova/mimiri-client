import { StandardTreeNode } from './data'

// Tree for all sync tests - minimal tree with just marker note
// All tests start with this and then create their specific test notes
export const syncNoteCreationTree: StandardTreeNode[] = [
	{
		title: 'Sync Marker',
		text: 'This note indicates sync is working between devices.',
	},
]

// Initial hierarchy tree for hierarchy tests - parent with two children
export const syncHierarchyInitialTree: StandardTreeNode[] = [
	{
		title: 'Parent Note',
		text: 'Parent note for hierarchy testing.',
		children: [
			{
				title: 'Child Note 1',
				text: 'First child note for hierarchy testing.',
			},
			{
				title: 'Child Note 2',
				text: 'Second child note for hierarchy testing.',
			},
		],
	},
]

// Tree after note creation test - shows new note added
export const syncAfterNoteCreation: StandardTreeNode[] = [
	{
		title: 'Sync Marker',
		text: 'This note indicates sync is working between devices.',
	},
	{
		title: 'Live Sync Test Note',
		text: 'This is content created live on device 1',
	},
]

// Tree after live edit test - shows content updated on device 1
export const syncAfterLiveEdit: StandardTreeNode[] = [
	{
		title: 'Sync Marker',
		text: 'This note indicates sync is working between devices.',
	},
	{
		title: 'Live Edit Test',
		text: 'Content edited live on device 1',
	},
]

// Tree after hierarchy change test - shows new child added
export const syncAfterHierarchyChange: StandardTreeNode[] = [
	{
		title: 'Sync Marker',
		text: 'This note indicates sync is working between devices.',
	},
	{
		title: 'Parent Note',
		text: 'Parent note for hierarchy testing.',
		children: [
			{
				title: 'Child Note 1',
				text: 'First child note for hierarchy testing.',
			},
			{
				title: 'Child Note 2',
				text: 'Second child note for hierarchy testing.',
			},
			{
				title: 'Child Note 3',
				text: 'Added live from device 1',
			},
		],
	},
]

// Tree after edit protection test - shows content updated after editing stops
export const syncAfterEditProtection: StandardTreeNode[] = [
	{
		title: 'Sync Marker',
		text: 'This note indicates sync is working between devices.',
	},
	{
		title: 'Edit Protection Test',
		text: 'Changed by device 1 while device 2 was editing',
	},
]

// Tree after concurrent edit test - shows conflict resolution result
export const syncAfterConcurrentEdit: StandardTreeNode[] = [
	{
		title: 'Sync Marker',
		text: 'This note indicates sync is working between devices.',
	},
	{
		title: 'Concurrent Edit Test',
		text: 'Edit from device 1', // or 'Edit from device 2' - depends on conflict resolution
	},
]
