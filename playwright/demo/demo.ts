import { StandardTreeNode } from '../notes/data'

// Tree for screenshots and demo videos
// Tree should contain a variety of note types and structures to show off features
// Alice is assumed to mix private and work notes
// There should be a subtree intended to be shared with Bob for work purposes
export const aliceInitialTree: StandardTreeNode[] = [
	{
		title: 'Work Projects',
		text: 'Professional projects and collaboration workspace - shared with team members',
		children: [
			{
				title: 'Mimiri Development',
				text: 'Note-taking app development project - shared workspace with Bob',
				children: [
					{
						title: 'Sprint Planning',
						text: 'Current sprint goals and task distribution',
						children: [
							{
								title: 'Authentication System',
								text: `# User Authentication Implementation

## Overview
Implementing a comprehensive authentication system with OAuth2 support. This is our highest priority item for the current sprint.

## Team Responsibilities
- **Alice**: Frontend login components, user state management, token handling
- **Bob**: Backend API integration, JWT implementation, OAuth provider setup

## Requirements
1. Support for email/password login
2. OAuth2 integration with Google and GitHub
3. JWT tokens with refresh mechanism
4. Password reset functionality
5. Account verification via email

## Technical Details
- Frontend: Vue 3 composables for auth state
- Backend: Express middleware for protected routes
- Token storage: Secure httpOnly cookies + localStorage for UI state
- Session management: Redis for scalability

## Timeline
- **Due**: March 15th (end of sprint)
- **Testing**: March 12-14
- **Code review**: March 10-11

## Notes from Discussion
Sarah mentioned we should consider 2FA for enterprise customers. Might be worth implementing the foundation now even if we don't expose the UI yet.

Also need to think about social login UX - should we show both email/password AND social buttons, or progressive disclosure?`,
							},
							{
								title: 'Real-time Sync',
								text: 'WebSocket implementation for live collaboration. Need to handle conflict resolution and offline scenarios.',
							},
							{
								title: 'Mobile App',
								text: 'Capacitor-based mobile version. Focus on touch gestures and responsive design.',
							},
						],
					},
					{
						title: 'Technical Specs',
						text: 'Architecture decisions and implementation details',
						children: [
							{
								title: 'Database Schema',
								text: 'User -> Workspace -> Notes hierarchy. Consider tree structure optimization for large datasets.',
							},
							{
								title: 'API Design',
								text: 'RESTful endpoints with GraphQL consideration. Implement proper versioning and rate limiting.',
							},
						],
					},
					{
						title: 'Meeting Notes',
						text: 'Team sync and client feedback sessions',
						children: [
							{
								title: 'Client Demo - Feb 28',
								text: `# Client Demo Feedback - February 28th

## Attendees
- Client: Sarah Chen (Product Lead), Mike Rodriguez (CTO)
- Our team: Alice, Bob, David (Sales)

## Demo Overview
Showed the collaborative editing features and real-time sync capabilities. Demo went really well - they were impressed with the smooth UX and how conflicts are handled.

## Positive Feedback
 **Sharing features**: Love how easy it is to invite collaborators
 **Real-time editing**: No lag, smooth cursor tracking
 **Conflict resolution**: Auto-merge works intuitively
 **Mobile responsiveness**: Tested on Sarah's iPhone, worked great

## Feature Requests
 **Better search functionality**
- Global search across all notes
- Search within note content, not just titles
- Filter by date, collaborators, tags
- Search history/recent searches

**Export options**
- PDF export with formatting preserved
- Markdown export for developers
- Bulk export of entire workspace
- Scheduled exports (maybe overkill?)

## Technical Questions
- **Performance**: How does it scale with 1000+ notes?
- **Permissions**: Need granular sharing (view-only, edit, admin)
- **Audit trail**: Who changed what and when?

## Next Steps
1. Prepare technical architecture doc for their team
2. Demo the search improvements in next iteration
3. Get access to their test environment for integration planning
4. Follow up on pricing for enterprise features

## Random Notes
Mike mentioned they're evaluating Notion vs custom solution. Our real-time collaboration is definitely a differentiator. Sarah seems to be the decision maker.

They're planning to roll out to 50 users initially, then scale to 500+ if successful.`,
							},
							{
								title: 'Team Standup - Mar 1',
								text: 'Bob completed user management API. Alice finished note editor components. Next: integration testing.',
							},
						],
					},
				],
			},
			{
				title: 'Client Projects',
				text: 'External client work and consultations',
				children: [
					{
						title: 'TechStart Dashboard',
						text: 'React dashboard for startup analytics. Focus on data visualization and real-time updates.',
					},
					{
						title: 'E-commerce Platform',
						text: 'Vue.js storefront with payment integration. Stripe implementation in progress.',
					},
				],
			},
		],
	},
	{
		title: 'Personal',
		text: 'Private notes, ideas, and personal development',
		children: [
			{
				title: 'Learning & Development',
				text: 'Skill improvement and course notes',
				children: [
					{
						title: 'Advanced TypeScript',
						text: `# Advanced TypeScript Learning Notes

## Current Course: Total TypeScript by Matt Pocock
About halfway through the advanced patterns section. This course is incredible - finally understanding the really complex generic stuff that I see in library code.

## Key Concepts Mastered

### Generic Constraints & Conditional Types
The \`extends\` keyword is so much more powerful than I realized:

\`\`\`typescript
type IsArray<T> = T extends any[] ? true : false;
type Result1 = IsArray<string[]>; // true
type Result2 = IsArray<string>;   // false
\`\`\`

### Template Literal Types
Mind-blowing that we can manipulate strings at the type level:

\`\`\`typescript
type EventNames<T> = \`on\${Capitalize<string & keyof T>}\`;
type ButtonEvents = EventNames<{click: void, hover: void}>;
// Result: "onClick" | "onHover"
\`\`\`

### Mapped Types with Key Remapping
This pattern keeps coming up in our codebase:

\`\`\`typescript
type Getters<T> = {
	[K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
\`\`\`

## Practical Applications in Our Project

### Form Validation Types
Created a type-safe form validator using conditional types. No more runtime errors from typos in field names!

\`\`\`typescript
type FormErrors<T> = Partial<Record<keyof T, string>>;
type ValidationResult<T> = {
	isValid: boolean;
	errors: FormErrors<T>;
};
\`\`\`

### API Response Types
Using branded types to prevent mixing up different ID types:

\`\`\`typescript
type UserId = string & { __brand: 'UserId' };
type NoteId = string & { __brand: 'NoteId' };
\`\`\`

This caught so many bugs where we were accidentally passing user IDs where note IDs were expected.

## Challenges I'm Working Through

### Recursive Types
Still struggling with deeply nested recursive types. Working on this problem:

"Create a type that can flatten nested arrays of any depth"

My current attempt:
\`\`\`typescript
type Flatten<T> = T extends (infer U)[]
	? U extends any[]
		? Flatten<U>
		: U
	: T;
\`\`\`

But it's not handling mixed types well yet.

### Higher-Order Function Types
Function composition with proper type inference is still tricky. The \`pipe\` utility I'm trying to build keeps losing type information.

## Resources I'm Using
1. **Total TypeScript Course** - Best investment I've made
2. **TypeScript Handbook** - Always going back to fundamentals
3. **Type Challenges GitHub** - Great practice problems
4. **Matt Pocock's Twitter** - Constant stream of TS tips

## Practical Wins This Month
- Eliminated 15+ runtime errors by adding better types
- Created type-safe event system for our component library
- Helped Bob with backend API types (finally understand Zod integration!)
- Reduced need for \`any\` types by ~80% in our codebase

## Next Learning Goals
1. **Utility Types Deep Dive**: Understand how \`Pick\`, \`Omit\`, etc. are implemented
2. **Declaration Merging**: Need this for extending third-party library types
3. **Module Augmentation**: Want to properly type our custom Vue plugins
4. **Performance**: Learn about how complex types affect compilation time

## Random Observations
The mental shift from "make it work" to "make it type-safe" has been huge. I used to think strong typing slowed me down, but now I catch so many bugs at compile time instead of in production.

Also realizing that good TypeScript is about expressing business logic in the type system. When the types tell the story of what the code does, it becomes self-documenting.

The community around TypeScript is amazing. Every time I'm stuck, someone has already solved a similar problem and shared it.`,
					},
					{
						title: 'UX Design Principles',
						text: 'Color theory, typography, and user psychology. Working on portfolio redesign project.',
					},
					{
						title: 'Leadership Skills',
						text: 'Communication strategies, team building, and conflict resolution techniques.',
					},
				],
			},
			{
				title: 'Personal Projects',
				text: 'Side projects and creative endeavors',
				children: [
					{
						title: 'Travel Blog',
						text: `# Japan Travel Blog Project

## Project Overview
Building a personal travel blog using Next.js with a headless CMS. Want to document my recent trip to Japan and create a platform for future travels.

## Technical Stack
- **Frontend**: Next.js 14 with App Router
- **CMS**: Sanity.io for content management
- **Styling**: Tailwind CSS + Framer Motion for animations
- **Hosting**: Vercel for automatic deployments
- **Images**: Cloudinary for optimization and CDN

## Content Plan
### Japan Trip Series (March 2024)
1. **Tokyo Arrival** - First impressions, jet lag, getting around
2. **Food Adventures** - Ramen tours, sushi experiences, convenience store gems
3. **Cultural Experiences** - Temples, gardens, traditional vs modern Tokyo
4. **Day Trip to Nikko** - UNESCO sites, nature, hot springs
5. **Osaka Food Scene** - Takoyaki, okonomiyaki, street food culture
6. **Kyoto Temples** - Fushimi Inari, Kiyomizu-dera, meditation experience
7. **Travel Tips** - JR Pass, accommodation, language barriers

## Features to Build
- [ ] Photo galleries with lightbox
- [ ] Interactive map showing travel route
- [ ] Comments system for readers
- [ ] Newsletter signup
- [ ] Social media sharing
- [ ] Search functionality
- [ ] Tag-based filtering

## Content Strategy
Want to focus on:
- **Authentic experiences** over tourist traps
- **Food photography** - spent so much on good shots!
- **Practical advice** for other travelers
- **Cultural insights** learned from locals

## Progress
- Basic site structure completed
- Sanity schema designed
- Photo organization (2,847 photos to sort through!)
- Writing first three posts
- SEO optimization
- Performance testing

## Writing Notes
The ramen post is getting long - might need to split into multiple parts. Also want to include video content from the cooking class in Kyoto.

## Lessons Learned
- Next.js Image component is amazing for the photo-heavy content
- Sanity's GROQ queries are really powerful but have a learning curve
- Should have taken more notes during the trip - relying too much on memory now

Need to be consistent with posting schedule once it launches. Thinking weekly posts?`,
					},
					{
						title: 'Garden Planning',
						text: 'Spring garden layout with companion planting. Focusing on tomatoes, herbs, and pollinator-friendly flowers.',
					},
					{
						title: 'Home Automation',
						text: 'Smart home setup with Home Assistant. Automating lights, temperature, and security system.',
					},
				],
			},
			{
				title: 'Ideas & Inspiration',
				text: 'Creative thoughts and future project concepts',
				children: [
					{
						title: 'App Ideas',
						text: 'Recipe manager with meal planning, fitness tracker with social features, book club organizer.',
					},
					{
						title: 'Business Concepts',
						text: 'Local artisan marketplace, remote work productivity consultancy, sustainable tech solutions.',
					},
				],
			},
		],
	},
	{
		title: 'Quick Notes',
		text: 'Daily reminders, temporary notes, and quick captures',
		children: [
			{
				title: "Today's Tasks",
				text: `# Tuesday, March 5th - Daily Tasks

## Work Priorities
- [x] Review Bob's PR for authentication middleware
	- Left some comments about error handling
	- Approved after changes - looks good!
- [ ] Prepare client demo for Thursday
	- Update slide deck with latest features
	- Test demo environment
	- Practice conflict resolution scenario
- [ ] Interview candidate at 2 PM
	- Senior React developer position
	- Focus on component architecture questions
	- Ask about experience with real-time features

## Personal Errands
- [ ] Grocery shopping
	- Milk, eggs, spinach for smoothies
	- Ingredients for tomorrow's dinner party
	- Don't forget the ice cream!
- [ ] Call dentist for appointment
	- Need cleaning + check on that sensitive tooth
	- Dr. Martinez's office: (555) 123-4567
- [ ] Pick up dry cleaning
	- Navy blazer for client meeting
	- Need it by Thursday morning

## Evening Plans
- [ ] Gym session - leg day
- [ ] Meal prep for rest of week
- [ ] Video call with sister (her time: 8 PM EST)
- [ ] Read chapter 3 of "Atomic Habits"

## Random Thoughts
Really happy with how the authentication system is coming along. The OAuth flow feels smooth and the error messages are much clearer now.

Need to remember to book that weekend trip to Portland. Sarah recommended that restaurant downtown - what was it called? Something with "Stone" in the name?

Weather forecast says rain tomorrow - bring umbrella for lunch meeting.`,
			},
			{
				title: 'Book Recommendations',
				text: 'Atomic Habits, The Pragmatic Programmer, Design Systems, Mindset by Carol Dweck.',
			},
			{
				title: 'Recipe Ideas',
				text: 'Thai green curry with vegetables, homemade sourdough bread, Mediterranean quinoa salad.',
			},
		],
	},
	{
		title: 'Reference Materials',
		text: 'Documentation, guides, and frequently accessed information',
		children: [
			{
				title: 'Code Snippets',
				text: 'Reusable code patterns and utilities',
				children: [
					{
						title: 'Vue Composables',
						text: 'useLocalStorage, useDebounce, useIntersectionObserver - custom hooks for common functionality.',
					},
					{
						title: 'TypeScript Utilities',
						text: 'Type guards, assertion functions, and generic helper types for better type safety.',
					},
				],
			},
			{
				title: 'Design Resources',
				text: 'Color palettes, typography scales, and design system components',
				children: [
					{
						title: 'Brand Colors',
						text: 'Primary: #3B82F6, Secondary: #10B981, Accent: #F59E0B, Neutral: #6B7280.',
					},
					{
						title: 'Typography',
						text: 'Headings: Inter Bold, Body: Inter Regular, Code: JetBrains Mono.',
					},
				],
			},
		],
	},
	{
		title: 'Secure Information',
		text: 'Private credentials, API keys, and sensitive data - encrypted and protected',
		children: [
			{
				title: 'Development Credentials',
				text: `# Development Environment Secrets

## Database Connections
**Local PostgreSQL**
- Host: localhost:5432
- Database: mimiri_dev
- Username: postgres
- Password: p\`dev_postgres_2024!\`

**Staging Database**
- Connection String: p\`postgresql://admin:St@g1ng_DB_Pass@staging-db.amazonaws.com:5432/mimiri_staging\`

## API Keys & Tokens
**OpenAI API** (for content suggestions)
- API Key: p\`sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz\`
- Organization ID: org-ABC123DEF456

**Stripe Keys** (payment processing)
- Test Secret Key: p\`sk_test_51234567890abcdefghijklmnopqrstuvwxyz\`
- Test Publishable Key: pk_test_51234567890abcdefghijklmnopqrstuvwxyz
- Webhook Secret: p\`whsec_1234567890abcdefghijklmnopqrstuvwxyz\`

**AWS Credentials**
- Access Key ID: AKIA1234567890ABCDXX
- Secret Access Key: p\`wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\`
- Region: us-west-2

## OAuth Application Secrets
**Google OAuth**
- Client ID: 123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
- Client Secret: p\`GOCSPX-1234567890abcdefghijklmnopqr\`

**GitHub OAuth**
- Client ID: Iv1.1234567890abcdef
- Client Secret: p\`1234567890abcdef1234567890abcdef12345678\`

## SSL Certificates
**Development Certificate**
- Private Key: p\`-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\`
- Certificate: Available in certs/ folder

## Notes
- All production credentials stored in AWS Secrets Manager
- Development credentials rotated monthly
- Never commit these to version control!`,
			},
			{
				title: 'Personal Accounts',
				text: `# Personal Account Information

## Financial Accounts
**Primary Bank** - Chase Checking
- Account: ****1234
- Online Password: p\`MySecureBank2024!@#\`
- Security Questions: Mother's maiden name: p\`Robinson\`

**Credit Cards**
**Visa - Main Card**
- Number: p\`4532 1234 5678 9012\`
- Expiry: 03/27
- CVV: p\`123\`
- PIN: p\`5847\`

**AmEx - Business Card**
- Number: p\`3782 822463 10005\`
- Expiry: 12/26
- CVV: p\`456\`

## Investment Accounts
**Fidelity 401k**
- Username: alice.chen.dev
- Password: p\`Invest2024$ecure\`
- Account #: p\`123-456789-01\`

**Robinhood**
- Email: alice.dev@email.com
- Password: p\`Trading$tocks2024\`
- 2FA Backup Codes: p\`12345678, 87654321, 13579246, 97531468\`

## Important Documents
**Social Security**: p\`123-45-6789\`
**Passport**: p\`A12345678\` (expires 2029)
**Driver's License**: p\`D1234567890\` (expires 2026)

## Emergency Contacts
**Mom**: (555) 123-4567
**Emergency Fund Access Code**: p\`FAMILY2024\`

## Insurance
**Health Insurance** - Blue Cross
- Member ID: p\`ABC123456789\`
- Group #: p\`12345\`

**Auto Insurance** - Geico
- Policy #: p\`9876543210\`
- Claim Phone: (800) 555-GEICO`,
			},
			{
				title: 'Home & Utilities',
				text: `# Home & Utility Account Information

## Smart Home System
**Home Assistant**
- Admin Username: alice
- Admin Password: p\`HomeAuto2024!Secure\`
- Local IP: 192.168.1.100
- External URL: p\`https://home.alicechen.net\`

**Ring Doorbell**
- Account: alice.dev@email.com
- Password: p\`RingSecure2024!\`
- Master Code: p\`8642\`

**Nest Thermostat**
- Account linked to Google
- Emergency Heat Code: p\`7531\`

## Utility Accounts
**Electric - PG&E**
- Account: p\`1234567890\`
- Login: alice.chen.dev@email.com
- Password: p\`PowerBill2024$\`

**Internet - Comcast**
- Account: p\`9876543210123\`
- WiFi Password (Main): p\`AliceSecureHome2024!\`
- WiFi Password (Guest): p\`GuestNetwork2024\`
- Admin Panel: 192.168.1.1
- Router Password: p\`ComcastAdmin2024\`

**Water - City Utilities**
- Account: p\`WAT-123456789\`
- Online Access Code: p\`H2O2024secure\`

## Home Security
**Alarm System - ADT**
- Master Code: p\`1357\`
- Duress Code: p\`9753\`
- Service Account: p\`ADT-HOME-456789\`

**Safe Combination**: p\`15-35-25\`
**Garage Door Code**: p\`4682\`

## Rental Property
**Tenant Portal**
- Property ID: p\`PROP-789012\`
- Access Code: p\`Rental2024Access\`

## Warranty Information
**Appliances Master List**
- Refrigerator Serial: p\`RF2024-567890\`
- Washer/Dryer Codes: p\`WD-234567, WD-234568\``,
			},
		],
	},
]

// Tree for screenshots and demo videos
// Tree should contain a variety of note types and structures to show off features
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
- **Access Token**: Short-lived (15 min), contains user claims
- **Refresh Token**: Long-lived (7 days), stored securely in httpOnly cookie

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
1. **Rate Limiting**: 5 failed login attempts = 15min lockout
2. **Password Requirements**:
	 - Min 8 characters
	 - At least 1 uppercase, lowercase, number
	 - Special characters recommended
3. **CSRF Protection**: Using double-submit cookie pattern
4. **SQL Injection**: All queries use parameterized statements

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
**Database Connection**
- DB_HOST: mimiri-prod.cluster-abc123.us-west-2.rds.amazonaws.com
- DB_USER: app_user
- DB_PASSWORD: p\`Pr0d_DB_App_U53r_2024!\`
- DB_NAME: mimiri_production

**Redis Configuration**
- REDIS_URL: p\`redis://:R3d1s_Auth_T0k3n_2024!@mimiri-cache.abc123.cache.amazonaws.com:6379\`
- REDIS_TTL: 3600

**Security Settings**
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
**BFS/DFS Fundamentals**
- Basic traversal patterns
- Cycle detection in directed/undirected graphs
- Connected components counting
- Topological sorting

**Shortest Path Algorithms**
- Dijkstra's algorithm (non-negative weights)
- Bellman-Ford (handles negative weights)
- Floyd-Warshall (all pairs shortest path)

**Minimum Spanning Tree**
- Kruskal's algorithm with Union-Find
- Prim's algorithm with priority queue

### Currently Learning: Advanced Graph Topics
**Network Flow**
- Ford-Fulkerson method
- Maximum bipartite matching
- Min-cut max-flow theorem

Working through this problem: "Given a flow network, find the maximum flow from source to sink."

The key insight is modeling this as a graph where edge capacities represent flow limits. Still wrapping my head around the residual graph concept.

**Graph Coloring**
- Chromatic number problems
- Applications in scheduling

## LeetCode Progress
**Total Solved**: 156 problems
**This Week**: 8 problems

### Recent Solutions Worth Remembering

**Problem**: Course Schedule II (Topological Sort)
**Key Insight**: Use DFS with three states (unvisited, visiting, visited) to detect cycles and build the ordering.

**Problem**: Word Ladder (BFS)
**Trick**: Bidirectional BFS cuts search space significantly. Start from both ends and meet in the middle.

**Problem**: Alien Dictionary (Topological Sort + Trie)
**Challenge**: Building the dependency graph from the word ordering was tricky.

### Problem Patterns I'm Getting Comfortable With
1. **Two Pointers**: Fast/slow for cycle detection, left/right for sorted arrays
2. **Sliding Window**: Fixed/variable size for substring problems
3. **Graph Traversal**: BFS for shortest path, DFS for exploration
4. **Dynamic Programming**: Bottom-up vs top-down trade-offs

### Areas Still Struggling With
- **Tree DP**: Problems like "Binary Tree Maximum Path Sum" still take me too long
- **Advanced String Algorithms**: KMP, Rabin-Karp, suffix arrays
- **Segment Trees**: Know the theory but implementation is still shaky

## Study Schedule
**Weekdays**: 1 hour before work (6:30-7:30 AM)
**Saturday**: 3 hours deep dive on new topics
**Sunday**: Review and practice previous week's problems

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
**Main Application Server**
- Instance ID: i-0123456789abcdef0
- SSH Key: ~/.ssh/mimiri-production.pem
- Username: ubuntu
- Server Password (sudo): p\`Pr0d_S3rv3r_2024!\`

**Database Server**
- RDS Endpoint: mimiri-prod.cluster-abc123.us-west-2.rds.amazonaws.com
- Master Username: postgres
- Master Password: p\`Pr0d_PostgreSQL_2024!@#$\`
- Read Replica Password: p\`R3adOnly_2024!\`

**Redis Cache**
- ElastiCache Endpoint: mimiri-cache.abc123.cache.amazonaws.com
- Auth Token: p\`R3d1s_Auth_T0k3n_2024!@#\`

## CI/CD & Deployment
**GitHub Actions Secrets**
- AWS_ACCESS_KEY_ID: AKIA1234567890ABCDEF
- AWS_SECRET_ACCESS_KEY: p\`wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\`
- DOCKER_REGISTRY_TOKEN: p\`dkr_pat_1234567890abcdefghijklmnopqrstuvwxyz\`

**Deployment Scripts**
- Production Deploy Key: p\`deploy_2024_secure_key_!@#\`
- Rollback Access Code: p\`R0llb@ck_2024\`

## Monitoring & Logging
**Datadog**
- API Key: p\`dd_api_key_1234567890abcdefghijklmnopqrstuvwxyz\`
- App Key: p\`dd_app_key_abcdef1234567890ghijklmnopqrstuvwxyz\`

**Sentry (Error Tracking)**
- DSN: p\`https://abc123def456@o123456.ingest.sentry.io/7890123\`
- Auth Token: p\`sntrys_1234567890abcdefghijklmnopqrstuvwxyz\`

**New Relic**
- License Key: p\`nr_license_1234567890abcdefghijklmnopqrstuvwxyz\`
- Admin Password: p\`N3wR3l1c_Adm1n_2024!\``,
			},
			{
				title: 'Third-Party Services',
				text: `# External Service Credentials

## Payment Processing
**Stripe Production**
- Secret Key: p\`sk_demo_51234567890abcdefghijklmnopqrstuvwxyz\`
- Publishable Key: pk_demo_51234567890abcdefghijklmnopqrstuvwxyz
- Webhook Signing Secret: p\`whsec_demo_1234567890abcdefghijklmnopqrstuvwxyz\`
- Connect Client Secret: p\`sk_demo_connect_abc123def456ghi789\`

**PayPal Business**
- Client ID: AXvNvZ1V2QlZ9MbF8wHVzY1P3Kj6LqR9
- Client Secret: p\`PayPal_C1i3nt_S3cr3t_2024!@#\`
- Webhook ID: p\`8AB12CD3EF45GH67IJ89KL01MN23OP45\`

## Email Services
**SendGrid**
- API Key: p\`SG.1234567890abcdefghijklmnopqrstuvwxyz.ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ\`
- Template IDs: Welcome: d-abc123, Reset: d-def456

**AWS SES**
- SMTP Username: AKIA1234567890ABCDEF
- SMTP Password: p\`SMTP_P@ssw0rd_2024!@#\`
- Region: us-west-2

## CDN & Storage
**Cloudflare**
- API Token: p\`cf_api_token_1234567890abcdefghijklmnopqrstuvwxyz\`
- Zone ID: abc123def456ghi789jkl012mno345pqr
- DNS API Key: p\`cloudflare_dns_2024!@#\`

**AWS S3 Buckets**
- Bucket: mimiri-prod-assets
- IAM User: s3-prod-access
- Access Key: AKIA9876543210FEDCBA
- Secret Key: p\`S3_Pr0d_Acc3ss_K3y_2024!@#$%\`

## Analytics & Tracking
**Google Analytics**
- Measurement ID: G-ABC123DEF4
- Service Account Key: p\`-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\`

**Mixpanel**
- Project Token: abc123def456ghi789jkl012mno345pqr
- API Secret: p\`mixpanel_api_secret_2024!@#\`

## Security Services
**Auth0 (Enterprise SSO)**
- Domain: mimiri-prod.us.auth0.com
- Client ID: ABC123def456GHI789jkl012MNO345pqr
- Client Secret: p\`Auth0_C1i3nt_S3cr3t_2024!@#$%\`
- Management API Token: p\`eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik...\`

## Backup Services
**Automated Backups**
- S3 Backup Bucket: mimiri-prod-backups
- Encryption Key: p\`B@ckup_3ncryp7i0n_K3y_2024!@#\`
- Restore Access Code: p\`R3st0r3_Acc3ss_2024!\``,
			},
		],
	},
]
