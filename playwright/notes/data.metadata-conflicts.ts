import { StandardTreeNode } from './data'

export const moveTestTree: StandardTreeNode[] = [
	{
		title: 'Project Alpha Research',
		text: 'Main research branch for Project Alpha initiative. Contains comprehensive market analysis and technical specifications.',
		children: [
			{
				title: 'Market Analysis',
				text: 'Detailed market research including competitor analysis, target demographics, and growth projections.',
			},
			{
				title: 'Technical Specifications',
				text: 'System requirements, architecture diagrams, and implementation roadmap for the Alpha project.',
			},
		],
	},
	{
		title: 'Personal Journal',
		text: 'Daily reflections and thoughts on various topics. A space for personal growth and mindfulness.',
		children: [
			{
				title: 'Morning Reflections',
				text: 'Daily morning thoughts and intentions. Capturing the mindset for each new day.',
			},
			{
				title: 'Evening Review',
				text: 'End-of-day reflections on accomplishments, challenges, and lessons learned.',
			},
		],
	},
	{
		title: 'Recipe Collection',
		text: 'Curated collection of favorite recipes and cooking experiments. A culinary journey through different cuisines.',
		children: [
			{
				title: 'Italian Classics',
				text: 'Traditional Italian recipes including pasta dishes, risottos, and regional specialties from various Italian regions.',
			},
			{
				title: 'Weekend Experiments',
				text: "Creative cooking experiments and fusion recipes tried during weekends. Notes on what worked and what didn't.",
			},
		],
	},
]
export const moveTestTreeAfterConflict: StandardTreeNode[] = [
	{
		title: 'Project Alpha Research',
		text: 'Main research branch for Project Alpha initiative. Contains comprehensive market analysis and technical specifications.',
		children: [
			{
				title: 'Market Analysis',
				text: 'Detailed market research including competitor analysis, target demographics, and growth projections.',
			},
		],
	},
	{
		title: 'Personal Journal',
		text: 'Daily reflections and thoughts on various topics. A space for personal growth and mindfulness.',
		children: [
			{
				title: 'Morning Reflections',
				text: 'Daily morning thoughts and intentions. Capturing the mindset for each new day.',
			},
			{
				title: 'Evening Review',
				text: 'End-of-day reflections on accomplishments, challenges, and lessons learned.',
			},
		],
	},
	{
		title: 'Recipe Collection',
		text: 'Curated collection of favorite recipes and cooking experiments. A culinary journey through different cuisines.',
		children: [
			{
				title: 'Italian Classics',
				text: 'Traditional Italian recipes including pasta dishes, risottos, and regional specialties from various Italian regions.',
				children: [
					{
						title: 'Technical Specifications',
						text: 'System requirements, architecture diagrams, and implementation roadmap for the Alpha project.',
					},
				],
			},
			{
				title: 'Weekend Experiments',
				text: "Creative cooking experiments and fusion recipes tried during weekends. Notes on what worked and what didn't.",
			},
		],
	},
]
