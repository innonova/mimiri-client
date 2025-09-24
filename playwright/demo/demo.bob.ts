import { StandardTreeNode } from '../notes/data'

export const bobInitialTree: StandardTreeNode[] = [
	{
		title: 'Engineering',
		text: 'Technical projects, system architecture, and development workflows',
		children: [
			{
				title: 'Mimiri Backend',
				text: 'Server-side development for the note-taking application',
				children: [
					{
						title: 'API Development',
						text: 'RESTful API implementation with Node.js and Express',
						children: [
							{
								title: 'User Authentication',
								text: `# JWT Authentication Implementation

## Current Status
Working on the backend authentication system. Got the basic JWT flow working but need to implement refresh tokens and OAuth2 providers.

## Architecture Decisions

### Token Strategy
Using dual-token approach:
- Access Token: Short-lived (15 min), contains user claims
- Refresh Token: Long-lived (7 days), stored securely in httpOnly cookie

Token structure:
\`\`\`javascript
{
	"access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
	"refresh_token": "stored_in_cookie",
	"expires_in": 900,
	"token_type": "Bearer"
}
\`\`\`

### Database Schema
Extended user table with auth-related fields:
\`\`\`sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
\`\`\`

## OAuth2 Implementation
### Google OAuth
- Client ID configured in environment
- Scopes: profile, email
- Callback URL: /auth/google/callback

### GitHub OAuth
- OAuth App registered
- Scopes: user:email
- Callback URL: /auth/github/callback

## Security Considerations
1. Rate Limiting: 5 failed login attempts = 15min lockout
2. Password Requirements:
	 - Min 8 characters
	 - At least 1 uppercase, lowercase, number
	 - Special characters recommended
3. CSRF Protection: Using double-submit cookie pattern
4. SQL Injection: All queries use parameterized statements

## Testing Strategy
- Unit tests for auth middleware
- Integration tests for login/logout flows
- E2E tests for OAuth flows
- Load testing for token validation performance

## Remaining Tasks
- [x] Basic JWT implementation
- [x] Password hashing with bcrypt
- [ ] OAuth2 provider integration (In Progress)
- [ ] Email verification system
- [ ] Password reset flow
- [ ] Rate limiting middleware
- [ ] Audit logging

## Performance Notes
Token validation is currently taking ~2ms per request. Might need to implement token caching if we see performance issues at scale.

Redis session store is working well for refresh tokens. Current setup can handle ~10k concurrent sessions.

## Questions for Alice
- How should we handle auth state in the frontend?
- Do we want "Remember me" functionality?
- Should failed OAuth attempts count toward rate limiting?`,
							},
							{
								title: 'Note Operations',
								text: 'CRUD operations for notes with tree structure support. Optimized queries for large datasets.',
							},
							{
								title: 'Real-time Features',
								text: 'WebSocket server for live collaboration. Handling concurrent edits and conflict resolution.',
							},
						],
					},
					{
						title: 'Database Design',
						text: 'PostgreSQL schema and optimization strategies',
						children: [
							{
								title: 'Schema Migration',
								text: 'Version-controlled database migrations using Knex.js. Handling data transformations safely.',
							},
							{
								title: 'Performance Tuning',
								text: 'Query optimization, indexing strategies, and connection pooling configuration.',
							},
						],
					},
					{
						title: 'DevOps & Deployment',
						text: 'Infrastructure, CI/CD, and monitoring setup',
						children: [
							{
								title: 'Docker Configuration',
								text: `# Docker Production Setup

## Multi-stage Build Configuration
Using optimized Dockerfile for production deployments with security best practices.

## Environment Variables
Database Connection
- DB_HOST: mimiri-prod.cluster-abc123.us-west-2.rds.amazonaws.com
- DB_USER: app_user
- DB_PASSWORD: p\`Pr0d_DB_App_U53r_2024!\`
- DB_NAME: mimiri_production

Redis Configuration
- REDIS_URL: p\`redis://:R3d1s_Auth_T0k3n_2024!@mimiri-cache.abc123.cache.amazonaws.com:6379\`
- REDIS_TTL: 3600

Security Settings
- JWT_SECRET: p\`JWT_S3cr3t_K3y_2024!@#$%^&*()_+\`
- ENCRYPTION_KEY: p\`AES_3ncryp7i0n_K3y_2024!@#$%\`
- SESSION_SECRET: p\`S3ss10n_S3cr3t_2024!@#$%\`

## Health Check Configuration
Custom health endpoint with authentication:
- Health Check URL: /api/health
- Health Check Token: p\`h3@1th_ch3ck_t0k3n_2024!\`

## Container Registry
- Registry: 123456789012.dkr.ecr.us-west-2.amazonaws.com/mimiri-backend
- Access credentials stored in AWS Secrets Manager
- Auto-deploy on main branch merge

## Resource Limits
- Memory: 512Mi
- CPU: 250m
- Horizontal Pod Autoscaling: 2-10 replicas`,
							},
							{
								title: 'AWS Infrastructure',
								text: 'ECS deployment with ALB, RDS instance, ElastiCache for session storage.',
							},
							{
								title: 'Monitoring Setup',
								text: 'CloudWatch logs, Datadog metrics, error tracking with Sentry integration.',
							},
						],
					},
				],
			},
			{
				title: 'System Architecture',
				text: 'High-level design decisions and architectural patterns',
				children: [
					{
						title: 'Microservices Design',
						text: 'Service boundaries, communication patterns, and data consistency strategies.',
					},
					{
						title: 'Scalability Planning',
						text: 'Horizontal scaling approaches, load balancing, and database sharding considerations.',
					},
					{
						title: 'Security Architecture',
						text: 'Authentication flows, authorization patterns, data encryption, and vulnerability assessments.',
					},
				],
			},
		],
	},
	{
		title: 'Learning Resources',
		text: 'Technical education, courses, and skill development materials',
		children: [
			{
				title: 'Computer Science',
				text: 'Fundamental CS concepts and advanced topics',
				children: [
					{
						title: 'Algorithms & Data Structures',
						text: `# DSA Learning Progress

## Current Focus: Graph Algorithms
Been working through graph problems since they come up a lot in system design interviews and actual work.

### Completed Topics
BFS/DFS Fundamentals
- Basic traversal patterns
- Cycle detection in directed/undirected graphs
- Connected components counting
- Topological sorting

Shortest Path Algorithms
- Dijkstra's algorithm (non-negative weights)
- Bellman-Ford (handles negative weights)
- Floyd-Warshall (all pairs shortest path)

Minimum Spanning Tree
- Kruskal's algorithm with Union-Find
- Prim's algorithm with priority queue

### Currently Learning: Advanced Graph Topics
Network Flow
- Ford-Fulkerson method
- Maximum bipartite matching
- Min-cut max-flow theorem

Working through this problem: "Given a flow network, find the maximum flow from source to sink."

The key insight is modeling this as a graph where edge capacities represent flow limits. Still wrapping my head around the residual graph concept.

Graph Coloring
- Chromatic number problems
- Applications in scheduling

## LeetCode Progress
Total Solved: 156 problems
This Week: 8 problems

### Recent Solutions Worth Remembering

Problem: Course Schedule II (Topological Sort)
Key Insight: Use DFS with three states (unvisited, visiting, visited) to detect cycles and build the ordering.

Problem: Word Ladder (BFS)
Trick: Bidirectional BFS cuts search space significantly. Start from both ends and meet in the middle.

Problem: Alien Dictionary (Topological Sort + Trie)
Challenge: Building the dependency graph from the word ordering was tricky.

### Problem Patterns I'm Getting Comfortable With
1. Two Pointers: Fast/slow for cycle detection, left/right for sorted arrays
2. Sliding Window: Fixed/variable size for substring problems
3. Graph Traversal: BFS for shortest path, DFS for exploration
4. Dynamic Programming: Bottom-up vs top-down trade-offs

### Areas Still Struggling With
- Tree DP: Problems like "Binary Tree Maximum Path Sum" still take me too long
- Advanced String Algorithms: KMP, Rabin-Karp, suffix arrays
- Segment Trees: Know the theory but implementation is still shaky

## Study Schedule
Weekdays: 1 hour before work (6:30-7:30 AM)
Saturday: 3 hours deep dive on new topics
Sunday: Review and practice previous week's problems

## Next Week Goals
1. Complete network flow section
2. Solve 10 more graph problems
3. Start dynamic programming review (it's been a while)
4. Watch that MIT opencourseware lecture on advanced graph algorithms

## Random Thoughts
Really starting to see how these patterns apply to real work. The tree traversal algorithms are super relevant for our note hierarchy system.

Also noticing that having a good mental model of the problem is way more important than memorizing implementations. When I understand WHY an algorithm works, coding it becomes much easier.`,
					},
					{
						title: 'Distributed Systems',
						text: 'CAP theorem, consensus algorithms, event sourcing, and CQRS patterns.',
					},
					{
						title: 'Database Theory',
						text: 'ACID properties, transaction isolation levels, query optimization, and NoSQL patterns.',
					},
				],
			},
			{
				title: 'Technology Deep Dives',
				text: 'In-depth exploration of specific technologies',
				children: [
					{
						title: 'Kubernetes Mastery',
						text: 'Pod networking, service discovery, ingress controllers, and operator development.',
					},
					{
						title: 'GraphQL Advanced',
						text: 'Schema stitching, federation, N+1 problem solutions, and subscription implementations.',
					},
					{
						title: 'Rust Programming',
						text: 'Ownership model, async programming, WebAssembly compilation, and performance optimization.',
					},
				],
			},
		],
	},
	{
		title: 'Research & Experiments',
		text: 'Proof of concepts, technology evaluations, and experimental projects',
		children: [
			{
				title: 'Performance Benchmarks',
				text: 'Database performance comparisons: PostgreSQL vs MongoDB vs Redis for different use cases.',
			},
			{
				title: 'AI Integration POC',
				text: 'Experimenting with OpenAI API for automatic note categorization and content suggestions.',
			},
			{
				title: 'Edge Computing',
				text: 'Cloudflare Workers deployment for geo-distributed API endpoints and caching strategies.',
			},
			{
				title: 'Blockchain Exploration',
				text: 'Smart contract development with Solidity. Building decentralized storage proof-of-concept.',
			},
		],
	},
	{
		title: 'Team Collaboration',
		text: 'Shared knowledge, team processes, and collaborative documentation',
		children: [
			{
				title: 'Code Review Guidelines',
				text: 'Best practices for effective code reviews, checklist items, and feedback techniques.',
			},
			{
				title: 'Onboarding Documentation',
				text: 'New team member guide: development setup, coding standards, and project architecture overview.',
			},
			{
				title: 'Technical Decisions',
				text: 'Architecture Decision Records (ADRs) documenting technology choices and trade-offs.',
				children: [
					{
						title: 'ADR-001: Database Choice',
						text: 'Chose PostgreSQL over MongoDB for strong consistency and complex queries. JSON columns for flexibility.',
					},
					{
						title: 'ADR-002: API Architecture',
						text: 'REST API with GraphQL evaluation. Chose REST for simplicity and team familiarity.',
					},
				],
			},
		],
	},
	{
		title: 'Tools & Utilities',
		text: 'Development tools, scripts, and workflow optimizations',
		children: [
			{
				title: 'Custom Scripts',
				text: 'Automation scripts for development workflow',
				children: [
					{
						title: 'Database Seeding',
						text: 'Scripts for generating test data and demo content. Includes user accounts and sample notes.',
					},
					{
						title: 'Deployment Automation',
						text: 'Blue-green deployment scripts with rollback capabilities and health check validation.',
					},
				],
			},
			{
				title: 'Development Setup',
				text: 'IDE configurations, extensions, and productivity tools',
				children: [
					{
						title: 'VS Code Configuration',
						text: 'Settings, extensions, and custom snippets for optimal development experience.',
					},
					{
						title: 'Terminal Setup',
						text: 'Zsh configuration with Oh My Zsh, useful aliases, and development shortcuts.',
					},
				],
			},
		],
	},
	{
		title: 'Production Secrets',
		text: 'Server credentials, production API keys, and infrastructure access',
		children: [
			{
				title: 'Server Infrastructure',
				text: `# Production Server Access

## AWS Production Environment
Main Application Server
- Instance ID: i-0123456789abcdef0
- SSH Key: ~/.ssh/mimiri-production.pem
- Username: ubuntu
- Server Password (sudo): p\`Pr0d_S3rv3r_2024!\`

Database Server
- RDS Endpoint: mimiri-prod.cluster-abc123.us-west-2.rds.amazonaws.com
- Master Username: postgres
- Master Password: p\`Pr0d_PostgreSQL_2024!@#$\`
- Read Replica Password: p\`R3adOnly_2024!\`

Redis Cache
- ElastiCache Endpoint: mimiri-cache.abc123.cache.amazonaws.com
- Auth Token: p\`R3d1s_Auth_T0k3n_2024!@#\`

## CI/CD & Deployment
GitHub Actions Secrets
- AWS_ACCESS_KEY_ID: AKIA1234567890ABCDEF
- AWS_SECRET_ACCESS_KEY: p\`wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\`
- DOCKER_REGISTRY_TOKEN: p\`dkr_pat_1234567890abcdefghijklmnopqrstuvwxyz\`

Deployment Scripts
- Production Deploy Key: p\`deploy_2024_secure_key_!@#\`
- Rollback Access Code: p\`R0llb@ck_2024\`

## Monitoring & Logging
Datadog
- API Key: p\`dd_api_key_1234567890abcdefghijklmnopqrstuvwxyz\`
- App Key: p\`dd_app_key_abcdef1234567890ghijklmnopqrstuvwxyz\`

Sentry (Error Tracking)
- DSN: p\`https://abc123def456@o123456.ingest.sentry.io/7890123\`
- Auth Token: p\`sntrys_1234567890abcdefghijklmnopqrstuvwxyz\`

New Relic
- License Key: p\`nr_license_1234567890abcdefghijklmnopqrstuvwxyz\`
- Admin Password: p\`N3wR3l1c_Adm1n_2024!\``,
			},
			{
				title: 'Third-Party Services',
				text: `# External Service Credentials

## Payment Processing
Stripe Production
- Secret Key: p\`sk_demo_51234567890abcdefghijklmnopqrstuvwxyz\`
- Publishable Key: pk_demo_51234567890abcdefghijklmnopqrstuvwxyz
- Webhook Signing Secret: p\`whsec_demo_1234567890abcdefghijklmnopqrstuvwxyz\`
- Connect Client Secret: p\`sk_demo_connect_abc123def456ghi789\`

PayPal Business
- Client ID: AXvNvZ1V2QlZ9MbF8wHVzY1P3Kj6LqR9
- Client Secret: p\`PayPal_C1i3nt_S3cr3t_2024!@#\`
- Webhook ID: p\`8AB12CD3EF45GH67IJ89KL01MN23OP45\`

## Email Services
SendGrid
- API Key: p\`SG.1234567890abcdefghijklmnopqrstuvwxyz.ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ\`
- Template IDs: Welcome: d-abc123, Reset: d-def456

AWS SES
- SMTP Username: AKIA1234567890ABCDEF
- SMTP Password: p\`SMTP_P@ssw0rd_2024!@#\`
- Region: us-west-2

## CDN & Storage
Cloudflare
- API Token: p\`cf_api_token_1234567890abcdefghijklmnopqrstuvwxyz\`
- Zone ID: abc123def456ghi789jkl012mno345pqr
- DNS API Key: p\`cloudflare_dns_2024!@#\`

AWS S3 Buckets
- Bucket: mimiri-prod-assets
- IAM User: s3-prod-access
- Access Key: AKIA9876543210FEDCBA
- Secret Key: p\`S3_Pr0d_Acc3ss_K3y_2024!@#$%\`

## Analytics & Tracking
Google Analytics
- Measurement ID: G-ABC123DEF4
- Service Account Key: p\`-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\`

Mixpanel
- Project Token: abc123def456ghi789jkl012mno345pqr
- API Secret: p\`mixpanel_api_secret_2024!@#\`

## Security Services
Auth0 (Enterprise SSO)
- Domain: mimiri-prod.us.auth0.com
- Client ID: ABC123def456GHI789jkl012MNO345pqr
- Client Secret: p\`Auth0_C1i3nt_S3cr3t_2024!@#$%\`
- Management API Token: p\`eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik...\`

## Backup Services
Automated Backups
- S3 Backup Bucket: mimiri-prod-backups
- Encryption Key: p\`B@ckup_3ncryp7i0n_K3y_2024!@#\`
- Restore Access Code: p\`R3st0r3_Acc3ss_2024!\``,
			},
		],
	},
]
