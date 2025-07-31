import { StandardTreeNode } from './data'

export const quotaTestTree: StandardTreeNode[] = [
	{
		title: 'Quota Test Root',
		text: 'Root node for testing note count quotas (16 items total)',
		children: [
			{
				title: 'Group A',
				text: 'First group of test items',
				children: [
					{
						title: 'Item 1',
						text: 'First test item for quota validation',
					},
					{
						title: 'Item 2',
						text: 'Second test item for quota validation',
					},
					{
						title: 'Item 3',
						text: 'Third test item for quota validation',
					},
				],
			},
			{
				title: 'Group B',
				text: 'Second group of test items',
				children: [
					{
						title: 'Item 4',
						text: 'Fourth test item for quota validation',
					},
					{
						title: 'Item 5',
						text: 'Fifth test item for quota validation',
					},
					{
						title: 'Item 6',
						text: 'Sixth test item for quota validation',
					},
				],
			},
			{
				title: 'Group C',
				text: 'Third group of test items',
				children: [
					{
						title: 'Item 7',
						text: 'Seventh test item for quota validation',
					},
					{
						title: 'Item 8',
						text: 'Eighth test item for quota validation',
					},
				],
			},
			{
				title: 'Item 9',
				text: 'Standalone test item for quota validation',
			},
			{
				title: 'Item 10',
				text: 'Another standalone test item for quota validation',
			},
			{
				title: 'Item 11',
				text: 'Final standalone test item for quota validation',
			},
			{
				title: 'Item 12',
				text: 'Last test item to reach exactly 16 items',
			},
		],
	},
]

export const quotaSizeTestTree: StandardTreeNode[] = [
	{
		title: 'Size Quota Test Root',
		text: 'Root node for testing storage size quotas. This tree contains content designed to approach the 50 kB compressed limit through various text patterns and content types.',
		children: [
			{
				title: 'Large Text Documents',
				text: 'Collection of documents with substantial text content for size testing.',
				children: [
					{
						title: 'Technical Documentation',
						text: `Comprehensive technical documentation for our application architecture. This document covers the entire system design including frontend components built with Vue 3 and TypeScript, backend REST API services, database schema design with PostgreSQL, caching strategies using Redis, authentication and authorization mechanisms with JWT tokens, file upload and storage systems, real-time communication using WebSockets and SignalR, monitoring and logging infrastructure, deployment pipelines with Docker and Kubernetes, testing strategies including unit tests with Jest and end-to-end tests with Playwright, performance optimization techniques, security best practices, API documentation with OpenAPI specifications, database migration procedures, backup and disaster recovery plans, scaling considerations for high-traffic scenarios, third-party service integrations, error handling and debugging procedures, code review guidelines, development environment setup instructions, and maintenance schedules for regular updates and patches.`,
					},
					{
						title: 'Code Examples Repository',
						text: `function authenticateUser(credentials) {
  const { username, password } = credentials;

  if (!username || !password) {
    throw new Error('Missing required credentials');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = database.users.findOne({ username });

  if (!user || !bcrypt.compareSync(password, user.hashedPassword)) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token, user: { id: user.id, username: user.username, role: user.role } };
}

async function processDataUpload(file, metadata) {
  try {
    const validation = await validateFileFormat(file);
    if (!validation.isValid) {
      throw new Error(\`Invalid file format: \${validation.error}\`);
    }

    const processedData = await transformData(file.content);
    const savedRecord = await database.uploads.create({
      filename: file.name,
      size: file.size,
      processedData,
      metadata,
      uploadedAt: new Date(),
      status: 'completed'
    });

    await notificationService.send({
      userId: metadata.userId,
      type: 'upload_complete',
      data: { recordId: savedRecord.id }
    });

    return savedRecord;
  } catch (error) {
    logger.error('Upload processing failed:', error);
    throw error;
  }
}`,
					},
					{
						title: 'Meeting Notes Archive',
						text: `Sprint Planning Meeting - Q1 2024
Attendees: Development Team (8 members), Product Manager, UX Designer, QA Lead
Duration: 2 hours

Agenda Items Discussed:
1. Sprint Goal Definition: Implement user authentication system with social login integration
2. Story Point Estimation: Team reviewed 15 user stories, estimated complexity using Planning Poker
3. Capacity Planning: Available 80 story points for 2-week sprint considering holidays and training
4. Risk Assessment: Identified potential blockers with third-party API integration
5. Definition of Done Review: Updated criteria to include accessibility testing
6. Sprint Backlog Creation: Selected 12 stories totaling 78 story points

Action Items:
- Set up development environments for OAuth integration by Wednesday
- Schedule design review session with UX team for login flow mockups
- Research rate limiting requirements for API endpoints
- Prepare test data sets for various authentication scenarios
- Document API contracts for frontend-backend integration
- Schedule security review with InfoSec team for authentication flows

Technical Decisions:
- Use JWT tokens for session management with 24-hour expiration
- Implement refresh token rotation for enhanced security
- Support Google, GitHub, and Microsoft social login providers
- Add two-factor authentication support for premium accounts
- Create unified user profile service for account management
- Implement progressive enhancement for mobile authentication experience

Next Sprint Preview:
Focus will shift to user profile management and account settings functionality once authentication foundation is solid.`,
					},
				],
			},
			{
				title: 'Configuration Files',
				text: 'Various configuration files and structured data for testing.',
				children: [
					{
						title: 'Application Settings',
						text: `{
  "application": {
    "name": "Mimiri Client",
    "version": "2.4.79",
    "environment": "production",
    "debug": false,
    "logging": {
      "level": "info",
      "format": "json",
      "destinations": ["file", "console", "remote"],
      "rotation": {
        "enabled": true,
        "maxSize": "100MB",
        "maxFiles": 10
      }
    }
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "mimiri_prod",
    "ssl": true,
    "poolSize": 20,
    "connectionTimeout": 30000,
    "idleTimeout": 600000,
    "retryAttempts": 3
  },
  "api": {
    "baseUrl": "https://api.mimiri.com",
    "timeout": 30000,
    "retryCount": 3,
    "rateLimit": {
      "windowMs": 900000,
      "max": 1000
    }
  },
  "features": {
    "authentication": true,
    "realTimeSync": true,
    "offlineMode": true,
    "fileUpload": true,
    "collaboration": true,
    "notifications": true,
    "analytics": false
  }
}`,
					},
					{
						title: 'Test Data Set',
						text: `User Test Scenarios:
1. Standard User Registration Flow
2. Social Login Integration Testing
3. Password Reset Functionality
4. Account Verification Process
5. Profile Update Operations
6. Subscription Management
7. Data Export Procedures
8. Account Deletion Workflow
9. Multi-device Synchronization
10. Offline Mode Validation

Sample Test Users:
- john.doe@example.com (Premium subscriber, active for 2 years)
- jane.smith@testmail.com (Free tier user, recent signup)
- admin@company.com (Administrator with full permissions)
- beta.tester@preview.com (Beta program participant)

Test Environments:
Development: dev.mimiri.com
Staging: staging.mimiri.com
Production: app.mimiri.com

Browser Compatibility Matrix:
Chrome 120+, Firefox 115+, Safari 16+, Edge 120+
Mobile: iOS Safari 16+, Android Chrome 120+

Performance Benchmarks:
Page Load Time: <2 seconds
API Response Time: <500ms
Search Query Time: <100ms
Sync Operation: <5 seconds`,
					},
				],
			},
			{
				title: 'Quick Reference',
				text: 'Compact reference data that should compress well due to repetitive patterns.',
			},
			{
				title: 'Binary Data Simulation',
				text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
			},
		],
	},
]
