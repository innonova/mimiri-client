interface ConflictScenario {
	name: string
	base: string
	local: string
	remote: string
	expected: string
	description: string
}

export const conflictScenarios: ConflictScenario[] = [
	{
		name: 'simple_text_conflict',
		description: 'Basic text conflict where both sides modify the same line',
		base: `Meeting Notes
Today's agenda:
- Review project status
- Discuss next steps
- Plan deployment`,
		local: `Meeting Notes
Today's agenda:
- Review project status
- Discuss next milestones
- Plan deployment`,
		remote: `Meeting Notes
Today's agenda:
- Review project status
- Discuss future plans
- Plan deployment`,
		expected: `Meeting Notes
Today's agenda:
- Review project status
<<<<<<< Local
- Discuss next milestones
=======
- Discuss future plans
>>>>>>> Server
- Plan deployment`,
	},

	{
		name: 'insertion_conflict',
		description: 'Conflict where both sides insert different content at the same location',
		base: `# Project Overview

## Features
- User authentication
- Data synchronization

## Status
Working on implementation`,
		local: `# Project Overview

## Features
- User authentication
- Real-time updates
- Data synchronization

## Status
Working on implementation`,
		remote: `# Project Overview

## Features
- User authentication
- Offline support
- Data synchronization

## Status
Working on implementation`,
		expected: `# Project Overview

## Features
- User authentication
<<<<<<< Local
- Real-time updates
=======
- Offline support
>>>>>>> Server
- Data synchronization

## Status
Working on implementation`,
	},

	{
		name: 'deletion_vs_modification',
		description: 'One side deletes a line while the other modifies it',
		base: `function processData(input) {
  const result = input.map(item => item.value);
  console.log('Processing complete');
  return result;
}`,
		local: `function processData(input) {
  const result = input.map(item => item.value);
  return result;
}`,
		remote: `function processData(input) {
  const result = input.map(item => item.value);
  console.log('Processing complete with validation');
  return result;
}`,
		expected: `function processData(input) {
  const result = input.map(item => item.value);
  console.log('Processing complete with validation');
  return result;
}`,
	},

	{
		name: 'whitespace_conflict',
		description: 'Conflict involving different whitespace changes',
		base: `const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3
};`,
		local: `const config = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3
};`,
		remote: `const config = {
	apiUrl: 'https://api.example.com',
	timeout: 5000,
	retries: 3
};`,
		expected: `const config = {
<<<<<<< Local
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3
=======
	apiUrl: 'https://api.example.com',
	timeout: 5000,
	retries: 3
>>>>>>> Server
};`,
	},

	{
		name: 'auto_mergeable',
		description: 'Changes that should merge automatically without conflicts',
		base: `# TODO List

## High Priority
- Fix authentication bug
- Update documentation

## Low Priority
- Refactor old code`,
		local: `# TODO List

## High Priority
- Fix authentication bug
- Update documentation
- Add error handling

## Low Priority
- Refactor old code`,
		remote: `# TODO List

## High Priority
- Fix authentication bug
- Update documentation

## Low Priority
- Refactor old code
- Improve performance`,
		expected: `# TODO List

## High Priority
- Fix authentication bug
- Update documentation
- Add error handling

## Low Priority
- Refactor old code
- Improve performance`,
	},

	{
		name: 'adjacent_lines_conflict',
		description: 'Conflict with modifications on adjacent lines',
		base: `const settings = {
  theme: 'light',
  language: 'en',
  notifications: true
};`,
		local: `const settings = {
  theme: 'dark',
  language: 'en',
  notifications: true
};`,
		remote: `const settings = {
  theme: 'light',
  language: 'fr',
  notifications: true
};`,
		expected: `const settings = {
<<<<<<< Local
  theme: 'dark',
  language: 'en',
=======
  theme: 'light',
  language: 'fr',
>>>>>>> Server
  notifications: true
};`,
	},

	{
		name: 'empty_lines_conflict',
		description: 'Conflict involving empty lines and spacing',
		base: `function init() {
  console.log('Starting...');

  setup();

  console.log('Ready!');
}`,
		local: `function init() {
  console.log('Starting...');

  setup();

  console.log('Ready!');
}`,
		remote: `function init() {
  console.log('Starting...');
  setup();
  console.log('Ready!');
}`,
		expected: `function init() {
  console.log('Starting...');
  setup();
  console.log('Ready!');
}`,
	},

	{
		name: 'large_block_conflict',
		description: 'Conflict with large blocks of different content',
		base: `# Documentation

## Installation
Run npm install to get started.

## Usage
Import the library and use the main function.`,
		local: `# Documentation

## Installation
1. Clone the repository
2. Run npm install
3. Configure your environment
4. Start the development server

## Usage
Import the library and use the main function.`,
		remote: `# Documentation

## Installation
Download the latest release and extract it.
Run the installer with admin privileges.
Restart your system after installation.

## Usage
Import the library and use the main function.`,
		expected: `# Documentation

## Installation
<<<<<<< Local
1. Clone the repository
2. Run npm install
3. Configure your environment
4. Start the development server
=======
Download the latest release and extract it.
Run the installer with admin privileges.
Restart your system after installation.
>>>>>>> Server

## Usage
Import the library and use the main function.`,
	},

	{
		name: 'nested_conflict',
		description: 'Conflict within nested structures',
		base: `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "^4.17.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}`,
		local: `{
  "name": "my-app",
  "version": "1.1.0",
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "^4.17.0",
    "axios": "^1.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}`,
		remote: `{
  "name": "my-app",
  "version": "1.0.1",
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "^4.17.0",
    "moment": "^2.29.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}`,
		expected: `{
  "name": "my-app",
<<<<<<< Local
  "version": "1.1.0",
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "^4.17.0",
    "axios": "^1.0.0"
=======
  "version": "1.0.1",
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "^4.17.0",
    "moment": "^2.29.0"
>>>>>>> Server
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}`,
	},

	// Higher-level system integration scenarios for e2e testing
	{
		name: 'clean_merge_no_ui',
		description: 'Clean merge that should happen silently without showing conflict UI',
		base: `# Project Status

## Completed
- Initial setup
- Basic structure

## In Progress
- Core functionality`,
		local: `# Project Status

## Completed
- Initial setup
- Basic structure
- Database setup

## In Progress
- Core functionality`,
		remote: `# Project Status

## Completed
- Initial setup
- Basic structure

## In Progress
- Core functionality
- Testing framework`,
		expected: `# Project Status

## Completed
- Initial setup
- Basic structure
- Database setup

## In Progress
- Core functionality
- Testing framework`,
	},

	{
		name: 'ui_should_appear',
		description: 'Conflict that should trigger the conflict resolution UI',
		base: `export const API_CONFIG = {
  baseUrl: 'https://api.staging.com',
  timeout: 30000,
  retries: 3
};`,
		local: `export const API_CONFIG = {
  baseUrl: 'https://api.production.com',
  timeout: 30000,
  retries: 3
};`,
		remote: `export const API_CONFIG = {
  baseUrl: 'https://api.development.com',
  timeout: 30000,
  retries: 3
};`,
		expected: `export const API_CONFIG = {
<<<<<<< Local
  baseUrl: 'https://api.production.com',
=======
  baseUrl: 'https://api.development.com',
>>>>>>> Server
  timeout: 30000,
  retries: 3
};`,
	},

	{
		name: 'user_data_preservation',
		description: 'Ensuring user data is preserved during conflict resolution',
		base: `Personal Notes:
- Meeting with team tomorrow
- Review quarterly goals
- Schedule vacation`,
		local: `Personal Notes:
- Meeting with team tomorrow
- Review quarterly goals
- Schedule vacation
- Call dentist`,
		remote: `Personal Notes:
- Meeting with team tomorrow
- Review quarterly goals
- Schedule vacation
- Update resume`,
		expected: `Personal Notes:
- Meeting with team tomorrow
- Review quarterly goals
- Schedule vacation
<<<<<<< Local
- Call dentist
=======
- Update resume
>>>>>>> Server`,
	},

	{
		name: 'large_document_handling',
		description: 'System performance with large documents in conflict',
		base: `${'# Section\nContent line\n'.repeat(50)}`,
		local: `${'# Section\nContent line\n'.repeat(50)}Additional local content\n`,
		remote: `${'# Section\nContent line\n'.repeat(50)}Additional remote content\n`,
		expected: `${'# Section\nContent line\n'.repeat(50)}<<<<<<< Local
Additional local content
=======
Additional remote content
>>>>>>> Server
`,
	},

	{
		name: 'special_characters_handling',
		description: 'Handling of special characters and unicode in conflicts',
		base: `Task List:
• Complete project review
• Send updates to team
• Prepare presentation`,
		local: `Task List:
• Complete project review ✓
• Send updates to team
• Prepare presentation`,
		remote: `Task List:
• Complete project review
• Send updates to team ✓
• Prepare presentation`,
		expected: `Task List:
<<<<<<< Local
• Complete project review ✓
• Send updates to team
=======
• Complete project review
• Send updates to team ✓
>>>>>>> Server
• Prepare presentation`,
	},

	{
		name: 'empty_to_content',
		description: 'Both sides adding content to empty document',
		base: ``,
		local: `Welcome to the new document!

This is the local version.`,
		remote: `Getting started guide

This is the remote version.`,
		expected: `<<<<<<< Local
Welcome to the new document!

This is the local version.
=======
Getting started guide

This is the remote version.
>>>>>>> Server`,
	},

	{
		name: 'concurrent_edits_simulation',
		description: 'Simulating concurrent edits scenario',
		base: `Status: Draft
Last modified: Yesterday
Content: Basic outline`,
		local: `Status: Review
Last modified: Today
Content: Basic outline`,
		remote: `Status: Draft
Last modified: Today
Content: Detailed outline`,
		expected: `<<<<<<< Local
Status: Review
Last modified: Today
Content: Basic outline
=======
Status: Draft
Last modified: Today
Content: Detailed outline
>>>>>>> Server`,
	},

	{
		name: 'metadata_conflict',
		description: 'Conflict in document metadata/headers',
		base: `---
title: Project Plan
author: Team Lead
version: 1.0
---

# Project Overview`,
		local: `---
title: Project Plan
author: Team Lead
version: 1.1
status: draft
---

# Project Overview`,
		remote: `---
title: Project Plan
author: Team Lead
version: 1.0
status: final
---

# Project Overview`,
		expected: `---
title: Project Plan
author: Team Lead
<<<<<<< Local
version: 1.1
status: draft
=======
version: 1.0
status: final
>>>>>>> Server
---

# Project Overview`,
	},

	{
		name: 'binary_like_content',
		description: 'Handling content that might look like binary data',
		base: `Config hash: abc123def456
Checksum: 789xyz
Status: active`,
		local: `Config hash: abc123def999
Checksum: 789xyz
Status: active`,
		remote: `Config hash: abc123def456
Checksum: 111xyz
Status: active`,
		expected: `<<<<<<< Local
Config hash: abc123def999
Checksum: 789xyz
=======
Config hash: abc123def456
Checksum: 111xyz
>>>>>>> Server
Status: active`,
	},

	{
		name: 'workflow_interruption',
		description: 'Conflict that would interrupt normal user workflow',
		base: `Current task: Writing report
Progress: 50%
Next: Add charts`,
		local: `Current task: Writing report
Progress: 75%
Next: Add charts`,
		remote: `Current task: Writing report
Progress: 60%
Next: Review with team`,
		expected: `Current task: Writing report
<<<<<<< Local
Progress: 75%
Next: Add charts
=======
Progress: 60%
Next: Review with team
>>>>>>> Server`,
	},

	{
		name: 'end_of_file_modify_vs_append',
		description: 'One user modifies the last line while another appends new content',
		base: `# Meeting Notes

## Attendees
- Alice
- Bob
- Charlie

## Action Items
- Review code changes`,
		local: `# Meeting Notes

## Attendees
- Alice
- Bob
- Charlie

## Action Items
- Review code changes thoroughly`,
		remote: `# Meeting Notes

## Attendees
- Alice
- Bob
- Charlie

## Action Items
- Review code changes
- Schedule follow-up meeting`,
		expected: `# Meeting Notes

## Attendees
- Alice
- Bob
- Charlie

## Action Items
- Review code changes thoroughly
- Schedule follow-up meeting`,
	},

	{
		name: 'both_append_different_content',
		description: 'Both users append different content to the end of the file',
		base: `# Configuration

database:
  host: localhost
  port: 5432

server:
  port: 3000`,
		local: `# Configuration

database:
  host: localhost
  port: 5432

server:
  port: 3000

# Local development settings
debug: true`,
		remote: `# Configuration

database:
  host: localhost
  port: 5432

server:
  port: 3000

# Production overrides
ssl: enabled`,
		expected: `# Configuration

database:
  host: localhost
  port: 5432

server:
  port: 3000

<<<<<<< Local
# Local development settings
debug: true
=======
# Production overrides
ssl: enabled
>>>>>>> Server`,
	},

	{
		name: 'both_append_similar_content',
		description: 'Both users append similar but different content at the end',
		base: `TODO:
- Fix login bug
- Update documentation
- Deploy to staging`,
		local: `TODO:
- Fix login bug
- Update documentation
- Deploy to staging
- Test on mobile devices`,
		remote: `TODO:
- Fix login bug
- Update documentation
- Deploy to staging
- Test mobile compatibility`,
		expected: `TODO:
- Fix login bug
- Update documentation
- Deploy to staging
<<<<<<< Local
- Test on mobile devices
=======
- Test mobile compatibility
>>>>>>> Server`,
	},

	{
		name: 'append_to_empty_last_line',
		description: 'One modifies empty last line while other appends after it',
		base: `function processData() {
  return result;
}

`,
		local: `function processData() {
  return result;
}

// End of file`,
		remote: `function processData() {
  return result;
}

export default processData;`,
		expected: `function processData() {
  return result;
}

<<<<<<< Local
// End of file
=======
export default processData;
>>>>>>> Server`,
	},

	{
		name: 'multiple_appends_at_end',
		description: 'Multiple lines appended by different users at file end',
		base: `class Logger {
  log(message) {
    console.log(message);
  }
}`,
		local: `class Logger {
  log(message) {
    console.log(message);
  }
}

// Version 1.0
module.exports = Logger;`,
		remote: `class Logger {
  log(message) {
    console.log(message);
  }
}

export { Logger };
export default Logger;`,
		expected: `class Logger {
  log(message) {
    console.log(message);
  }
}

<<<<<<< Local
// Version 1.0
module.exports = Logger;
=======
export { Logger };
export default Logger;
>>>>>>> Server`,
	},

	{
		name: 'modify_last_line_append_after',
		description: 'Last line modified while new content appended after original end',
		base: `const config = {
  api: 'https://api.example.com',
  timeout: 5000
};`,
		local: `const config = {
  api: 'https://api.example.com',
  timeout: 10000
};`,
		remote: `const config = {
  api: 'https://api.example.com',
  timeout: 5000
};

export default config;`,
		expected: `const config = {
  api: 'https://api.example.com',
  timeout: 10000
};

export default config;`,
	},
]

export const getScenarioByName = (name: string): ConflictScenario | undefined => {
	return conflictScenarios.find(scenario => scenario.name === name)
}

export const getScenariosByType = (type: 'conflict' | 'auto-merge'): ConflictScenario[] => {
	return conflictScenarios.filter(scenario => {
		return type === 'conflict'
			? scenario.expected.includes('<<<<<<< Local')
			: !scenario.expected.includes('<<<<<<< Local')
	})
}

// Helper for e2e tests to categorize scenarios by expected system behavior
export const getScenariosByBehavior = (
	behavior: 'silent-merge' | 'show-ui' | 'preserve-data' | 'performance',
): ConflictScenario[] => {
	const behaviorMap = {
		'silent-merge': ['clean_merge_no_ui', 'auto_mergeable'],
		'show-ui': ['ui_should_appear', 'simple_text_conflict', 'workflow_interruption'],
		'preserve-data': ['user_data_preservation', 'metadata_conflict'],
		performance: ['large_document_handling', 'concurrent_edits_simulation'],
	}

	const targetNames = behaviorMap[behavior] || []
	return conflictScenarios.filter(scenario => targetNames.includes(scenario.name))
}
