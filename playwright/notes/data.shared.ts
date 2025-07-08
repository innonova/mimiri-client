import { StandardTreeNode } from './data'

// Tree for shared note tests - minimal shared container with marker note
export const sharedBaseTree: StandardTreeNode[] = [
	{
		title: 'Shared Container',
		text: 'This note will be shared between users for live sync testing.',
		children: [
			{
				title: 'Sync Marker',
				text: 'This marker indicates sharing sync is working between users.',
			},
		],
	},
]

// Collaboration hub tree for user 2
export const collaborationHubTree: StandardTreeNode[] = [
	{
		title: 'Collaboration Hub',
		text: 'This note will receive shared content for testing.',
	},
]

// Tree after note creation in shared container (including collaboration hub structure)
export const afterNoteCreation: StandardTreeNode[] = [
	{
		title: 'Collaboration Hub',
		text: 'This note will receive shared content for testing.',
		children: [
			{
				title: 'Shared Container',
				text: 'This note will be shared between users for live sync testing.',
				children: [
					{
						title: 'Sync Marker',
						text: 'This marker indicates sharing sync is working between users.',
					},
					{
						title: 'Live Shared Note',
						text: 'This is content created live by user 1 in shared space',
					},
				],
			},
		],
	},
]

// Tree after editing in shared container (including collaboration hub structure)
export const afterEdit: StandardTreeNode[] = [
	{
		title: 'Collaboration Hub',
		text: 'This note will receive shared content for testing.',
		children: [
			{
				title: 'Shared Container',
				text: 'This note will be shared between users for live sync testing.',
				children: [
					{
						title: 'Sync Marker',
						text: 'This marker indicates sharing sync is working between users.',
					},
					{
						title: 'Live Shared Edit Test',
						text: 'Content edited live by user 1 in shared space',
					},
				],
			},
		],
	},
]
