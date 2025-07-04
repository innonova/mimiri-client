export interface StandardTreeNode {
	title: string
	text?: string
	children?: StandardTreeNode[]
}

export const standardTree: StandardTreeNode[] = [
	{
		title: 'Project Management',
		text: 'Main project management workspace with tasks, timelines, and team coordination notes.',
		children: [
			{
				title: 'Current Sprint',
				text: 'Active development sprint items and progress tracking.',
				children: [
					{
						title: 'User Authentication',
						text: 'Implement OAuth2 login system with social media integration. Priority: High. Due: End of sprint.',
					},
					{
						title: 'Database Migration',
						text: 'Migrate from PostgreSQL 12 to 14. Includes schema updates and performance optimizations.',
					},
					{
						title: 'API Rate Limiting',
						text: 'Implement rate limiting middleware to prevent abuse. Target: 1000 req/hour per user.',
					},
					{
						title: 'Mobile Responsive Design',
						text: 'Ensure all pages work correctly on mobile devices. Test on iOS and Android.',
					},
					{
						title: 'Performance Optimization',
						text: 'Reduce page load times by 30%. Focus on image compression and lazy loading.',
					},
				],
			},
			{
				title: 'Backlog',
				text: 'Future features and improvements planned for upcoming sprints.',
				children: [
					{
						title: 'Dark Mode Theme',
						text: 'Implement dark mode toggle with user preference persistence. Include accessibility considerations.',
					},
					{
						title: 'Advanced Search',
						text: 'Add fuzzy search, filters, and sorting options. Consider implementing Elasticsearch.',
					},
					{
						title: 'Notification System',
						text: 'Real-time notifications using WebSockets. Include email and push notification options.',
					},
					{
						title: 'Internationalization',
						text: 'Support for multiple languages. Start with English, Spanish, and French.',
					},
					{
						title: 'Export Functionality',
						text: 'Allow users to export data in PDF, CSV, and JSON formats.',
					},
				],
			},
			{
				title: 'Technical Debt',
				text: 'Items that need refactoring or improvement for maintainability.',
				children: [
					{
						title: 'Legacy Code Cleanup',
						text: 'Remove deprecated functions and update outdated dependencies. Estimated effort: 2 weeks.',
					},
					{
						title: 'Test Coverage',
						text: 'Increase unit test coverage from 65% to 85%. Focus on critical business logic.',
					},
					{
						title: 'Documentation Update',
						text: 'Update API documentation and add code comments. Include architecture diagrams.',
					},
				],
			},
		],
	},
	{
		title: 'Research & Development',
		text: 'Exploration of new technologies, proof of concepts, and experimental features.',
		children: [
			{
				title: 'AI Integration',
				text: 'Investigating machine learning applications for our product.',
				children: [
					{
						title: 'Natural Language Processing',
						text: 'Explore using NLP for automatic categorization of user content. Consider OpenAI API.',
					},
					{
						title: 'Recommendation Engine',
						text: 'Build personalized content recommendations using collaborative filtering.',
					},
					{
						title: 'Automated Testing',
						text: 'Research AI-powered test generation and bug detection tools.',
					},
				],
			},
			{
				title: 'New Technologies',
				text: 'Evaluation of emerging technologies and frameworks.',
				children: [
					{
						title: 'WebAssembly Investigation',
						text: 'Assess WASM for performance-critical components. Compare with current JavaScript implementation.',
					},
					{
						title: 'GraphQL Migration',
						text: 'Evaluate migrating from REST to GraphQL. Consider Apollo Server and client-side caching.',
					},
					{
						title: 'Microservices Architecture',
						text: 'Research breaking monolith into microservices. Consider Docker and Kubernetes deployment.',
					},
				],
			},
		],
	},
	{
		title: 'Meeting Notes',
		text: 'Documentation from team meetings, client calls, and planning sessions.',
		children: [
			{
				title: 'Weekly Standup',
				text: 'Regular team sync meetings and progress updates.',
				children: [
					{
						title: 'Week of Jan 15, 2024',
						text: 'Team completed authentication module. Database migration 70% done. Identified performance bottleneck in search functionality.',
					},
					{
						title: 'Week of Jan 8, 2024',
						text: 'Sprint planning completed. New team member onboarded. Decided to postpone mobile app features to next quarter.',
					},
					{
						title: 'Week of Jan 1, 2024',
						text: 'Post-holiday sync. Reviewed Q4 achievements. Set goals for Q1: focus on performance and user experience.',
					},
				],
			},
			{
				title: 'Client Meetings',
				text: 'Notes from client interactions and feedback sessions.',
				children: [
					{
						title: 'Product Demo - TechCorp',
						text: 'Positive feedback on new dashboard. Requested integration with their CRM system. Timeline: 6 weeks.',
					},
					{
						title: 'Requirements Review - StartupXYZ',
						text: 'Need custom branding options and white-label solution. Budget approved for additional development.',
					},
					{
						title: 'Feedback Session - Enterprise Client',
						text: 'Requested advanced reporting features and role-based permissions. High priority for renewal.',
					},
				],
			},
		],
	},
	{
		title: 'Personal Learning',
		text: 'Individual skill development and learning resources.',
		children: [
			{
				title: 'Programming Concepts',
				text: 'Advanced programming patterns and best practices.',
				children: [
					{
						title: 'Design Patterns',
						text: 'Study of Gang of Four patterns: Observer, Strategy, Factory, Singleton. Focus on practical applications.',
					},
					{
						title: 'Functional Programming',
						text: 'Learning immutability, pure functions, and functional composition. Practice with Haskell and F#.',
					},
					{
						title: 'System Design',
						text: 'Scalable architecture patterns: load balancing, caching strategies, database sharding.',
					},
				],
			},
			{
				title: 'Course Notes',
				text: 'Notes from online courses and educational content.',
				children: [
					{
						title: 'Advanced React Patterns',
						text: 'Compound components, render props, custom hooks. Completed modules 1-5, working on performance optimization.',
					},
					{
						title: 'AWS Solutions Architect',
						text: 'Studying for certification. Covered EC2, S3, RDS, Lambda. Practice exam score: 78%.',
					},
					{
						title: 'Machine Learning Fundamentals',
						text: 'Linear regression, decision trees, neural networks. Working on final project: image classification.',
					},
				],
			},
		],
	},
	{
		title: 'Documentation Hub',
		text: 'Central location for all project documentation, guidelines, and references.',
		children: [
			{
				title: 'API Documentation',
				text: 'Comprehensive API reference and integration guides.',
				children: [
					{
						title: 'Authentication Endpoints',
						text: 'POST /auth/login, /auth/logout, /auth/refresh. Include JWT token format and expiration handling.',
					},
					{
						title: 'User Management API',
						text: 'CRUD operations for user accounts. GET /users, POST /users, PUT /users/:id, DELETE /users/:id.',
					},
					{
						title: 'Data Export API',
						text: 'Bulk data export functionality. Supports pagination, filtering, and multiple formats.',
					},
				],
			},
			{
				title: 'Deployment Guides',
				text: 'Step-by-step deployment and configuration instructions.',
				children: [
					{
						title: 'Production Deployment',
						text: 'Docker containerization, environment variables, database setup, SSL configuration.',
					},
					{
						title: 'Development Environment',
						text: 'Local setup instructions, required dependencies, configuration files, testing procedures.',
					},
					{
						title: 'CI/CD Pipeline',
						text: 'GitHub Actions workflow, automated testing, staging deployment, production release process.',
					},
				],
			},
		],
	},
	{
		title: 'Quick References',
		text: 'Handy reference materials and cheat sheets for daily use.',
		children: [
			{
				title: 'Git Commands',
				text: 'Commonly used Git commands: git rebase -i, git cherry-pick, git bisect, git worktree.',
			},
			{
				title: 'Docker Commands',
				text: 'Container management: docker-compose up -d, docker logs --follow, docker exec -it bash.',
			},
			{
				title: 'SQL Queries',
				text: 'Performance optimization: EXPLAIN ANALYZE, indexing strategies, query plan analysis.',
			},
			{
				title: 'Keyboard Shortcuts',
				text: 'VS Code shortcuts: Ctrl+Shift+P (command palette), Ctrl+` (terminal), F12 (go to definition).',
			},
		],
	},
]

export const testTree: StandardTreeNode[] = [
	{
		title: 'Test Root A',
		text: 'First test root for copy/move operations',
		children: [
			{
				title: 'Folder 1',
				text: 'First test folder with items',
				children: [
					{
						title: 'Item A1',
						text: 'Simple test item for copying',
					},
					{
						title: 'Item A2',
						text: 'Another test item for moving',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Second test folder',
				children: [
					{
						title: 'Item B1',
						text: 'Item in second folder',
					},
				],
			},
			{
				title: 'Single Item',
				text: 'Standalone item for testing',
			},
		],
	},
	{
		title: 'Test Root B',
		text: 'Second test root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Empty folder for receiving copied/moved items',
			},
			{
				title: 'Source Folder',
				text: 'Folder with items to copy/move',
				children: [
					{
						title: 'Movable Item',
						text: 'Item designed for move testing',
					},
					{
						title: 'Copyable Item',
						text: 'Item designed for copy testing',
					},
				],
			},
		],
	},
]

// Expected state after moving "Item A1" from "Test Root A > Folder 1" to "Test Root B > Target Folder"
export const testTreeAfterMove: StandardTreeNode[] = [
	{
		title: 'Test Root A',
		text: 'First test root for copy/move operations',
		children: [
			{
				title: 'Folder 1',
				text: 'First test folder with items',
				children: [
					{
						title: 'Item A2',
						text: 'Another test item for moving',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Second test folder',
				children: [
					{
						title: 'Item B1',
						text: 'Item in second folder',
					},
				],
			},
			{
				title: 'Single Item',
				text: 'Standalone item for testing',
			},
		],
	},
	{
		title: 'Test Root B',
		text: 'Second test root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Empty folder for receiving copied/moved items',
				children: [
					{
						title: 'Item A1',
						text: 'Simple test item for copying',
					},
				],
			},
			{
				title: 'Source Folder',
				text: 'Folder with items to copy/move',
				children: [
					{
						title: 'Movable Item',
						text: 'Item designed for move testing',
					},
					{
						title: 'Copyable Item',
						text: 'Item designed for copy testing',
					},
				],
			},
		],
	},
]

// Expected state after copying "Copyable Item" from "Test Root B > Source Folder" to "Test Root A > Folder 2"
export const testTreeAfterCopy: StandardTreeNode[] = [
	{
		title: 'Test Root A',
		text: 'First test root for copy/move operations',
		children: [
			{
				title: 'Folder 1',
				text: 'First test folder with items',
				children: [
					{
						title: 'Item A1',
						text: 'Simple test item for copying',
					},
					{
						title: 'Item A2',
						text: 'Another test item for moving',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Second test folder',
				children: [
					{
						title: 'Item B1',
						text: 'Item in second folder',
					},
					{
						title: 'Copyable Item',
						text: 'Item designed for copy testing',
					},
				],
			},
			{
				title: 'Single Item',
				text: 'Standalone item for testing',
			},
		],
	},
	{
		title: 'Test Root B',
		text: 'Second test root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Empty folder for receiving copied/moved items',
			},
			{
				title: 'Source Folder',
				text: 'Folder with items to copy/move',
				children: [
					{
						title: 'Movable Item',
						text: 'Item designed for move testing',
					},
					{
						title: 'Copyable Item',
						text: 'Item designed for copy testing',
					},
				],
			},
		],
	},
]

// Complex tree with multiple levels for testing deep copy/move operations
export const complexTestTree: StandardTreeNode[] = [
	{
		title: 'Deep Root A',
		text: 'Root with deeply nested structures',
		children: [
			{
				title: 'Level 1 Folder',
				text: 'First level folder',
				children: [
					{
						title: 'Level 2 Folder A',
						text: 'Second level folder A',
						children: [
							{
								title: 'Level 3 Item A1',
								text: 'Deep nested item for testing',
							},
							{
								title: 'Level 3 Folder',
								text: 'Third level folder',
								children: [
									{
										title: 'Level 4 Item',
										text: 'Very deep nested item',
									},
									{
										title: 'Level 4 Folder',
										text: 'Fourth level folder',
										children: [
											{
												title: 'Level 5 Item',
												text: 'Extremely deep item for complex move testing',
											},
										],
									},
								],
							},
						],
					},
					{
						title: 'Level 2 Folder B',
						text: 'Second level folder B',
						children: [
							{
								title: 'Level 3 Item B1',
								text: 'Another deep nested item',
							},
							{
								title: 'Level 3 Item B2',
								text: 'Item for copy testing with children context',
							},
						],
					},
					{
						title: 'Level 2 Single Item',
						text: 'Item at second level',
					},
				],
			},
			{
				title: 'Level 1 Target Area',
				text: 'Destination area for testing moves',
				children: [
					{
						title: 'Target Subfolder',
						text: 'Nested target for complex operations',
					},
				],
			},
		],
	},
	{
		title: 'Deep Root B',
		text: 'Second root with complex structure',
		children: [
			{
				title: 'Branch Container',
				text: 'Container for multiple branches',
				children: [
					{
						title: 'Branch 1',
						text: 'First branch with nested content',
						children: [
							{
								title: 'Leaf 1A',
								text: 'Leaf item in branch 1',
							},
							{
								title: 'Sub-branch',
								text: 'Nested branch structure',
								children: [
									{
										title: 'Deep Leaf',
										text: 'Item in sub-branch for testing',
									},
								],
							},
						],
					},
					{
						title: 'Branch 2',
						text: 'Second branch for cross-branch operations',
						children: [
							{
								title: 'Leaf 2A',
								text: 'Leaf item in branch 2',
							},
						],
					},
				],
			},
			{
				title: 'Complex Target',
				text: 'Multi-level target structure',
				children: [
					{
						title: 'Nested Target',
						text: 'Target with its own structure',
						children: [
							{
								title: 'Deep Target',
								text: 'Very nested target location',
							},
						],
					},
				],
			},
		],
	},
]

// Expected state after moving "Level 3 Folder" (with all its children) from "Deep Root A > Level 1 Folder > Level 2 Folder A" to "Deep Root B > Complex Target"
export const complexTestTreeAfterMove: StandardTreeNode[] = [
	{
		title: 'Deep Root A',
		text: 'Root with deeply nested structures',
		children: [
			{
				title: 'Level 1 Folder',
				text: 'First level folder',
				children: [
					{
						title: 'Level 2 Folder A',
						text: 'Second level folder A',
						children: [
							{
								title: 'Level 3 Item A1',
								text: 'Deep nested item for testing',
							},
						],
					},
					{
						title: 'Level 2 Folder B',
						text: 'Second level folder B',
						children: [
							{
								title: 'Level 3 Item B1',
								text: 'Another deep nested item',
							},
							{
								title: 'Level 3 Item B2',
								text: 'Item for copy testing with children context',
							},
						],
					},
					{
						title: 'Level 2 Single Item',
						text: 'Item at second level',
					},
				],
			},
			{
				title: 'Level 1 Target Area',
				text: 'Destination area for testing moves',
				children: [
					{
						title: 'Target Subfolder',
						text: 'Nested target for complex operations',
					},
				],
			},
		],
	},
	{
		title: 'Deep Root B',
		text: 'Second root with complex structure',
		children: [
			{
				title: 'Branch Container',
				text: 'Container for multiple branches',
				children: [
					{
						title: 'Branch 1',
						text: 'First branch with nested content',
						children: [
							{
								title: 'Leaf 1A',
								text: 'Leaf item in branch 1',
							},
							{
								title: 'Sub-branch',
								text: 'Nested branch structure',
								children: [
									{
										title: 'Deep Leaf',
										text: 'Item in sub-branch for testing',
									},
								],
							},
						],
					},
					{
						title: 'Branch 2',
						text: 'Second branch for cross-branch operations',
						children: [
							{
								title: 'Leaf 2A',
								text: 'Leaf item in branch 2',
							},
						],
					},
				],
			},
			{
				title: 'Complex Target',
				text: 'Multi-level target structure',
				children: [
					{
						title: 'Nested Target',
						text: 'Target with its own structure',
						children: [
							{
								title: 'Deep Target',
								text: 'Very nested target location',
							},
						],
					},
					{
						title: 'Level 3 Folder',
						text: 'Third level folder',
						children: [
							{
								title: 'Level 4 Item',
								text: 'Very deep nested item',
							},
							{
								title: 'Level 4 Folder',
								text: 'Fourth level folder',
								children: [
									{
										title: 'Level 5 Item',
										text: 'Extremely deep item for complex move testing',
									},
								],
							},
						],
					},
				],
			},
		],
	},
]

// Expected state after copying "Branch 1" (with all its children) from "Deep Root B > Branch Container" to "Deep Root A > Level 1 Target Area"
export const complexTestTreeAfterCopy: StandardTreeNode[] = [
	{
		title: 'Deep Root A',
		text: 'Root with deeply nested structures',
		children: [
			{
				title: 'Level 1 Folder',
				text: 'First level folder',
				children: [
					{
						title: 'Level 2 Folder A',
						text: 'Second level folder A',
						children: [
							{
								title: 'Level 3 Item A1',
								text: 'Deep nested item for testing',
							},
							{
								title: 'Level 3 Folder',
								text: 'Third level folder',
								children: [
									{
										title: 'Level 4 Item',
										text: 'Very deep nested item',
									},
									{
										title: 'Level 4 Folder',
										text: 'Fourth level folder',
										children: [
											{
												title: 'Level 5 Item',
												text: 'Extremely deep item for complex move testing',
											},
										],
									},
								],
							},
						],
					},
					{
						title: 'Level 2 Folder B',
						text: 'Second level folder B',
						children: [
							{
								title: 'Level 3 Item B1',
								text: 'Another deep nested item',
							},
							{
								title: 'Level 3 Item B2',
								text: 'Item for copy testing with children context',
							},
						],
					},
					{
						title: 'Level 2 Single Item',
						text: 'Item at second level',
					},
				],
			},
			{
				title: 'Level 1 Target Area',
				text: 'Destination area for testing moves',
				children: [
					{
						title: 'Target Subfolder',
						text: 'Nested target for complex operations',
					},
					{
						title: 'Branch 1',
						text: 'First branch with nested content',
						children: [
							{
								title: 'Leaf 1A',
								text: 'Leaf item in branch 1',
							},
							{
								title: 'Sub-branch',
								text: 'Nested branch structure',
								children: [
									{
										title: 'Deep Leaf',
										text: 'Item in sub-branch for testing',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		title: 'Deep Root B',
		text: 'Second root with complex structure',
		children: [
			{
				title: 'Branch Container',
				text: 'Container for multiple branches',
				children: [
					{
						title: 'Branch 1',
						text: 'First branch with nested content',
						children: [
							{
								title: 'Leaf 1A',
								text: 'Leaf item in branch 1',
							},
							{
								title: 'Sub-branch',
								text: 'Nested branch structure',
								children: [
									{
										title: 'Deep Leaf',
										text: 'Item in sub-branch for testing',
									},
								],
							},
						],
					},
					{
						title: 'Branch 2',
						text: 'Second branch for cross-branch operations',
						children: [
							{
								title: 'Leaf 2A',
								text: 'Leaf item in branch 2',
							},
						],
					},
				],
			},
			{
				title: 'Complex Target',
				text: 'Multi-level target structure',
				children: [
					{
						title: 'Nested Target',
						text: 'Target with its own structure',
						children: [
							{
								title: 'Deep Target',
								text: 'Very nested target location',
							},
						],
					},
				],
			},
		],
	},
]

// Tree structure designed for testing sharing functionality
export const shareTestTree: StandardTreeNode[] = [
	{
		title: 'Public Projects',
		text: 'Collection of projects intended for sharing with team members and external collaborators.',
		children: [
			{
				title: 'Team Handbook',
				text: 'Comprehensive guide for team processes and procedures. Perfect for sharing with new team members.',
				children: [
					{
						title: 'Onboarding Process',
						text: 'Step-by-step guide for new employee onboarding. Should be shared with HR and managers.',
					},
					{
						title: 'Development Guidelines',
						text: 'Coding standards and best practices for the development team.',
						children: [
							{
								title: 'Code Review Checklist',
								text: 'Detailed checklist for code review process. Share with all developers.',
							},
							{
								title: 'Git Workflow',
								text: 'Branch naming conventions and merge request procedures.',
							},
						],
					},
					{
						title: 'Communication Protocols',
						text: 'Guidelines for internal and external communication.',
					},
				],
			},
			{
				title: 'Client Resources',
				text: 'Materials and documentation for client sharing.',
				children: [
					{
						title: 'Project Proposal Template',
						text: 'Standard template for project proposals. Can be shared with potential clients.',
					},
					{
						title: 'API Documentation',
						text: 'Public API documentation for client integration.',
						children: [
							{
								title: 'Authentication Guide',
								text: 'How to authenticate with our API services.',
							},
							{
								title: 'Rate Limiting Info',
								text: 'Information about API rate limits and best practices.',
							},
						],
					},
					{
						title: 'Support Contact Info',
						text: 'Contact information for technical support and account management.',
					},
				],
			},
			{
				title: 'Single Shareable Note',
				text: 'A standalone note perfect for testing single note sharing functionality.',
			},
		],
	},
	{
		title: 'Private Workspace',
		text: 'Personal workspace with some items that should not be shared.',
		children: [
			{
				title: 'Internal Planning',
				text: 'Confidential planning documents for internal use only.',
				children: [
					{
						title: 'Budget Considerations',
						text: 'Financial planning and budget allocations - confidential.',
					},
					{
						title: 'Staff Performance Reviews',
						text: 'Sensitive HR information - should not be shared.',
					},
				],
			},
			{
				title: 'Shareable Research',
				text: 'Research findings that can be selectively shared.',
				children: [
					{
						title: 'Market Analysis',
						text: 'Market research findings suitable for sharing with partners.',
					},
					{
						title: 'Technology Trends',
						text: 'Industry trends analysis - good for sharing with technical teams.',
					},
				],
			},
		],
	},
]

// Smaller tree for testing receiving shared notes and folders
export const receiveShareTestTree: StandardTreeNode[] = [
	{
		title: 'My Workspace',
		text: 'Personal workspace for receiving and organizing shared content.',
		children: [
			{
				title: 'Shared Projects',
				text: 'Folder for organizing projects shared by team members.',
				children: [
					{
						title: 'Existing Project',
						text: 'A project that was already in the workspace before receiving shares.',
					},
				],
			},
			{
				title: 'Collaboration Hub',
				text: 'Central location for collaborative work and shared resources.',
			},
			{
				title: 'Personal Notes',
				text: 'Private notes that should remain separate from shared content.',
				children: [
					{
						title: 'Meeting Notes',
						text: 'Personal meeting notes and observations.',
					},
					{
						title: 'Todo List',
						text: 'Personal task list and reminders.',
					},
				],
			},
		],
	},
	{
		title: 'Archive',
		text: 'Storage for older projects and completed work.',
		children: [
			{
				title: 'Completed Projects',
				text: 'Folder for finished projects and archived materials.',
			},
		],
	},
]

// Expected state after receiving "Single Shareable Note" into "Collaboration Hub"
export const receiveShareTestTreeAfterSingleNote: StandardTreeNode[] = [
	{
		title: 'My Workspace',
		text: 'Personal workspace for receiving and organizing shared content.',
		children: [
			{
				title: 'Shared Projects',
				text: 'Folder for organizing projects shared by team members.',
				children: [
					{
						title: 'Existing Project',
						text: 'A project that was already in the workspace before receiving shares.',
					},
				],
			},
			{
				title: 'Collaboration Hub',
				text: 'Central location for collaborative work and shared resources.',
				children: [
					{
						title: 'Single Shareable Note',
						text: 'A standalone note perfect for testing single note sharing functionality.',
					},
				],
			},
			{
				title: 'Personal Notes',
				text: 'Private notes that should remain separate from shared content.',
				children: [
					{
						title: 'Meeting Notes',
						text: 'Personal meeting notes and observations.',
					},
					{
						title: 'Todo List',
						text: 'Personal task list and reminders.',
					},
				],
			},
		],
	},
	{
		title: 'Archive',
		text: 'Storage for older projects and completed work.',
		children: [
			{
				title: 'Completed Projects',
				text: 'Folder for finished projects and archived materials.',
			},
		],
	},
]

// Expected state after receiving "Team Handbook" folder (with all children) into "Shared Projects"
export const receiveShareTestTreeAfterFolder: StandardTreeNode[] = [
	{
		title: 'My Workspace',
		text: 'Personal workspace for receiving and organizing shared content.',
		children: [
			{
				title: 'Shared Projects',
				text: 'Folder for organizing projects shared by team members.',
				children: [
					{
						title: 'Existing Project',
						text: 'A project that was already in the workspace before receiving shares.',
					},
					{
						title: 'Team Handbook',
						text: 'Comprehensive guide for team processes and procedures. Perfect for sharing with new team members.',
						children: [
							{
								title: 'Onboarding Process',
								text: 'Step-by-step guide for new employee onboarding. Should be shared with HR and managers.',
							},
							{
								title: 'Development Guidelines',
								text: 'Coding standards and best practices for the development team.',
								children: [
									{
										title: 'Code Review Checklist',
										text: 'Detailed checklist for code review process. Share with all developers.',
									},
									{
										title: 'Git Workflow',
										text: 'Branch naming conventions and merge request procedures.',
									},
								],
							},
							{
								title: 'Communication Protocols',
								text: 'Guidelines for internal and external communication.',
							},
						],
					},
				],
			},
			{
				title: 'Collaboration Hub',
				text: 'Central location for collaborative work and shared resources.',
			},
			{
				title: 'Personal Notes',
				text: 'Private notes that should remain separate from shared content.',
				children: [
					{
						title: 'Meeting Notes',
						text: 'Personal meeting notes and observations.',
					},
					{
						title: 'Todo List',
						text: 'Personal task list and reminders.',
					},
				],
			},
		],
	},
	{
		title: 'Archive',
		text: 'Storage for older projects and completed work.',
		children: [
			{
				title: 'Completed Projects',
				text: 'Folder for finished projects and archived materials.',
			},
		],
	},
]

// Expected state after receiving multiple items: "API Documentation" into "Collaboration Hub" and "Market Analysis" into "Archive"
export const receiveShareTestTreeAfterMultiple: StandardTreeNode[] = [
	{
		title: 'My Workspace',
		text: 'Personal workspace for receiving and organizing shared content.',
		children: [
			{
				title: 'Shared Projects',
				text: 'Folder for organizing projects shared by team members.',
				children: [
					{
						title: 'Existing Project',
						text: 'A project that was already in the workspace before receiving shares.',
					},
				],
			},
			{
				title: 'Collaboration Hub',
				text: 'Central location for collaborative work and shared resources.',
				children: [
					{
						title: 'API Documentation',
						text: 'Public API documentation for client integration.',
						children: [
							{
								title: 'Authentication Guide',
								text: 'How to authenticate with our API services.',
							},
							{
								title: 'Rate Limiting Info',
								text: 'Information about API rate limits and best practices.',
							},
						],
					},
				],
			},
			{
				title: 'Personal Notes',
				text: 'Private notes that should remain separate from shared content.',
				children: [
					{
						title: 'Meeting Notes',
						text: 'Personal meeting notes and observations.',
					},
					{
						title: 'Todo List',
						text: 'Personal task list and reminders.',
					},
				],
			},
		],
	},
	{
		title: 'Archive',
		text: 'Storage for older projects and completed work.',
		children: [
			{
				title: 'Completed Projects',
				text: 'Folder for finished projects and archived materials.',
			},
			{
				title: 'Market Analysis',
				text: 'Market research findings suitable for sharing with partners.',
			},
		],
	},
]

// Expected state after receiving shares into both empty and non-empty folders with mixed content types
export const receiveShareTestTreeAfterMixed: StandardTreeNode[] = [
	{
		title: 'My Workspace',
		text: 'Personal workspace for receiving and organizing shared content.',
		children: [
			{
				title: 'Shared Projects',
				text: 'Folder for organizing projects shared by team members.',
				children: [
					{
						title: 'Existing Project',
						text: 'A project that was already in the workspace before receiving shares.',
					},
					{
						title: 'Project Proposal Template',
						text: 'Standard template for project proposals. Can be shared with potential clients.',
					},
					{
						title: 'Development Guidelines',
						text: 'Coding standards and best practices for the development team.',
						children: [
							{
								title: 'Code Review Checklist',
								text: 'Detailed checklist for code review process. Share with all developers.',
							},
							{
								title: 'Git Workflow',
								text: 'Branch naming conventions and merge request procedures.',
							},
						],
					},
				],
			},
			{
				title: 'Collaboration Hub',
				text: 'Central location for collaborative work and shared resources.',
				children: [
					{
						title: 'Support Contact Info',
						text: 'Contact information for technical support and account management.',
					},
					{
						title: 'Technology Trends',
						text: 'Industry trends analysis - good for sharing with technical teams.',
					},
				],
			},
			{
				title: 'Personal Notes',
				text: 'Private notes that should remain separate from shared content.',
				children: [
					{
						title: 'Meeting Notes',
						text: 'Personal meeting notes and observations.',
					},
					{
						title: 'Todo List',
						text: 'Personal task list and reminders.',
					},
				],
			},
		],
	},
	{
		title: 'Archive',
		text: 'Storage for older projects and completed work.',
		children: [
			{
				title: 'Completed Projects',
				text: 'Folder for finished projects and archived materials.',
			},
		],
	},
]

// Minimal tree for testing keyboard shortcuts (cut, copy, paste, delete, rename, duplicate)
export const keyboardTestTree: StandardTreeNode[] = [
	{
		title: 'Root A',
		text: 'First root for keyboard shortcut testing',
		children: [
			{
				title: 'Folder 1',
				text: 'Source folder for operations',
				children: [
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
					{
						title: 'Item Y',
						text: 'Item for delete/rename operations',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Target folder for paste operations',
			},
		],
	},
	{
		title: 'Root B',
		text: 'Second root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Alternative target for testing',
			},
		],
	},
]

// Expected state after cutting "Item X" and pasting into "Folder 2"
export const keyboardTestTreeAfterCut: StandardTreeNode[] = [
	{
		title: 'Root A',
		text: 'First root for keyboard shortcut testing',
		children: [
			{
				title: 'Folder 1',
				text: 'Source folder for operations',
				children: [
					{
						title: 'Item Y',
						text: 'Item for delete/rename operations',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Target folder for paste operations',
				children: [
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
				],
			},
		],
	},
	{
		title: 'Root B',
		text: 'Second root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Alternative target for testing',
			},
		],
	},
]

// Expected state after copying "Item X" and pasting into "Target Folder"
export const keyboardTestTreeAfterCopy: StandardTreeNode[] = [
	{
		title: 'Root A',
		text: 'First root for keyboard shortcut testing',
		children: [
			{
				title: 'Folder 1',
				text: 'Source folder for operations',
				children: [
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
					{
						title: 'Item Y',
						text: 'Item for delete/rename operations',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Target folder for paste operations',
			},
		],
	},
	{
		title: 'Root B',
		text: 'Second root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Alternative target for testing',
				children: [
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
				],
			},
		],
	},
]

// Expected state after deleting "Item Y"
export const keyboardTestTreeAfterDelete: StandardTreeNode[] = [
	{
		title: 'Root A',
		text: 'First root for keyboard shortcut testing',
		children: [
			{
				title: 'Folder 1',
				text: 'Source folder for operations',
				children: [
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Target folder for paste operations',
			},
		],
	},
	{
		title: 'Root B',
		text: 'Second root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Alternative target for testing',
			},
		],
	},
]

// Expected state after renaming "Item Y" to "Renamed Item"
export const keyboardTestTreeAfterRename: StandardTreeNode[] = [
	{
		title: 'Root A',
		text: 'First root for keyboard shortcut testing',
		children: [
			{
				title: 'Folder 1',
				text: 'Source folder for operations',
				children: [
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
					{
						title: 'Renamed Item',
						text: 'Item for delete/rename operations',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Target folder for paste operations',
			},
		],
	},
	{
		title: 'Root B',
		text: 'Second root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Alternative target for testing',
			},
		],
	},
]

// Expected state after duplicating "Item X" (creates second "Item X Copy")
export const keyboardTestTreeAfterDuplicate: StandardTreeNode[] = [
	{
		title: 'Root A',
		text: 'First root for keyboard shortcut testing',
		children: [
			{
				title: 'Folder 1',
				text: 'Source folder for operations',
				children: [
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
					{
						title: 'Item X',
						text: 'Item for cut/copy operations',
					},
					{
						title: 'Item Y',
						text: 'Item for delete/rename operations',
					},
				],
			},
			{
				title: 'Folder 2',
				text: 'Target folder for paste operations',
			},
		],
	},
	{
		title: 'Root B',
		text: 'Second root for cross-root operations',
		children: [
			{
				title: 'Target Folder',
				text: 'Alternative target for testing',
			},
		],
	},
]
