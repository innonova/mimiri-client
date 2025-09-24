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
- Alice: Frontend login components, user state management, token handling
- Bob: Backend API integration, JWT implementation, OAuth provider setup

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
- Due: March 15th (end of sprint)
- Testing: March 12-14
- Code review: March 10-11

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
 Sharing features: Love how easy it is to invite collaborators
 Real-time editing: No lag, smooth cursor tracking
 Conflict resolution: Auto-merge works intuitively
 Mobile responsiveness: Tested on Sarah's iPhone, worked great

## Feature Requests
 Better search functionality
- Global search across all notes
- Search within note content, not just titles
- Filter by date, collaborators, tags
- Search history/recent searches

Export options
- PDF export with formatting preserved
- Markdown export for developers
- Bulk export of entire workspace
- Scheduled exports (maybe overkill?)

## Technical Questions
- Performance: How does it scale with 1000+ notes?
- Permissions: Need granular sharing (view-only, edit, admin)
- Audit trail: Who changed what and when?

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
1. Total TypeScript Course - Best investment I've made
2. TypeScript Handbook - Always going back to fundamentals
3. Type Challenges GitHub - Great practice problems
4. Matt Pocock's Twitter - Constant stream of TS tips

## Practical Wins This Month
- Eliminated 15+ runtime errors by adding better types
- Created type-safe event system for our component library
- Helped Bob with backend API types (finally understand Zod integration!)
- Reduced need for \`any\` types by ~80% in our codebase

## Next Learning Goals
1. Utility Types Deep Dive: Understand how \`Pick\`, \`Omit\`, etc. are implemented
2. Declaration Merging: Need this for extending third-party library types
3. Module Augmentation: Want to properly type our custom Vue plugins
4. Performance: Learn about how complex types affect compilation time

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
- Frontend: Next.js 14 with App Router
- CMS: Sanity.io for content management
- Styling: Tailwind CSS + Framer Motion for animations
- Hosting: Vercel for automatic deployments
- Images: Cloudinary for optimization and CDN

## Content Plan
### Japan Trip Series (March 2024)
1. Tokyo Arrival - First impressions, jet lag, getting around
2. Food Adventures - Ramen tours, sushi experiences, convenience store gems
3. Cultural Experiences - Temples, gardens, traditional vs modern Tokyo
4. Day Trip to Nikko - UNESCO sites, nature, hot springs
5. Osaka Food Scene - Takoyaki, okonomiyaki, street food culture
6. Kyoto Temples - Fushimi Inari, Kiyomizu-dera, meditation experience
7. Travel Tips - JR Pass, accommodation, language barriers

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
- Authentic experiences over tourist traps
- Food photography - spent so much on good shots!
- Practical advice for other travelers
- Cultural insights learned from locals

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
			{
				title: 'Trips & Events',
				text: 'Quick reference guides and cheat sheets',
				children: [
					{
						title: 'Weekend Cabin Trip Planning',
						text: `# Tahoe cabin Apr 12-14

Cabin booked. Coordinating logistics.

## Logistics
Fri 7pm arrival. Sarah driving w/ Mike, Jenny flying in.

Address: 2847 Pine Ridge Road, South Lake Tahoe, CA 96150
Lockbox: 7429

WiFi: TahoeGuest2024 / p\`MountainView!89\`

## Activities
- [x] Sat morning: Eagle Falls hike
- [ ] Paddleboards
- [ ] Campfire Sat night
- [ ] Sun brunch (Jenny's place)
- [ ] Checkout 11am

## Food
Potluck style.

Sat dinner (me):
- [x] Grocery run Fri night
- [ ] Pasta dish
- [ ] Garlic bread, Caesar salad
- [ ] Wine (that Pinot)

Mom's sauce: San Marzano tomatoes, basil, garlic, balsamic splash

Sarah: French toast breakfast
Brunch: Mountain View Café

## Pack
- [ ] Hiking gear
- [ ] Swimsuit/lake stuff
- [ ] Warm clothes (cold at night)
- [ ] Camera
- [ ] Games
- [ ] Speaker
- [ ] Coffee

## Money
$87 cabin split
$30 gas
$40 food
= $157 total

Jenny Venmo: @jenny-lake-adventures (restaurants)

## Weather
Fri: Clear 68°
Sat: Cloudy 72°
Sun: Rain? 64°

## Notes
Jenny = vegetarian now
Mike health stuff: anxiety worse since job change
Sarah bringing new bf Tom (photographer)

Emergency: (530) 555-0147 cabin, (530) 541-3420 urgent care`,
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
Local PostgreSQL
- Host: localhost:5432
- Database: mimiri_dev
- Username: postgres
- Password: p\`dev_postgres_2024!\`

Staging Database
- Connection String: p\`postgresql://admin:St@g1ng_DB_Pass@staging-db.amazonaws.com:5432/mimiri_staging\`

## API Keys & Tokens
OpenAI API (for content suggestions)
- API Key: p\`sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz\`
- Organization ID: org-ABC123DEF456

Stripe Keys (payment processing)
- Test Secret Key: p\`sk_test_51234567890abcdefghijklmnopqrstuvwxyz\`
- Test Publishable Key: pk_test_51234567890abcdefghijklmnopqrstuvwxyz
- Webhook Secret: p\`whsec_1234567890abcdefghijklmnopqrstuvwxyz\`

AWS Credentials
- Access Key ID: AKIA1234567890ABCDXX
- Secret Access Key: p\`wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\`
- Region: us-west-2

## OAuth Application Secrets
Google OAuth
- Client ID: 123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
- Client Secret: p\`GOCSPX-1234567890abcdefghijklmnopqr\`

GitHub OAuth
- Client ID: Iv1.1234567890abcdef
- Client Secret: p\`1234567890abcdef1234567890abcdef12345678\`

## SSL Certificates
Development Certificate
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
Primary Bank - Chase Checking
- Account: 1234
- Online Password: p\`MySecureBank2024!@#\`
- Security Questions: Mother's maiden name: p\`Robinson\`

Credit Cards
Visa - Main Card
- Number: p\`4532 1234 5678 9012\`
- Expiry: 03/27
- CVV: p\`123\`
- PIN: p\`5847\`

AmEx - Business Card
- Number: p\`3782 822463 10005\`
- Expiry: 12/26
- CVV: p\`456\`

## Investment Accounts
Fidelity 401k
- Username: alice.chen.dev
- Password: p\`Invest2024$ecure\`
- Account #: p\`123-456789-01\`

Robinhood
- Email: alice.dev@email.com
- Password: p\`Trading$tocks2024\`
- 2FA Backup Codes: p\`12345678, 87654321, 13579246, 97531468\`

## Important Documents
Social Security: p\`123-45-6789\`
Passport: p\`A12345678\` (expires 2029)
Driver's License: p\`D1234567890\` (expires 2026)

## Emergency Contacts
Mom: (555) 123-4567
Emergency Fund Access Code: p\`FAMILY2024\`

## Insurance
Health Insurance - Blue Cross
- Member ID: p\`ABC123456789\`
- Group #: p\`12345\`

Auto Insurance - Geico
- Policy #: p\`9876543210\`
- Claim Phone: (800) 555-GEICO`,
			},
			{
				title: 'Home & Utilities',
				text: `# Home & Utility Account Information

## Smart Home System
Home Assistant
- Admin Username: alice
- Admin Password: p\`HomeAuto2024!Secure\`
- Local IP: 192.168.1.100
- External URL: p\`https://home.alicechen.net\`

Ring Doorbell
- Account: alice.dev@email.com
- Password: p\`RingSecure2024!\`
- Master Code: p\`8642\`

Nest Thermostat
- Account linked to Google
- Emergency Heat Code: p\`7531\`

## Utility Accounts
Electric - PG&E
- Account: p\`1234567890\`
- Login: alice.chen.dev@email.com
- Password: p\`PowerBill2024$\`

Internet - Comcast
- Account: p\`9876543210123\`
- WiFi Password (Main): p\`AliceSecureHome2024!\`
- WiFi Password (Guest): p\`GuestNetwork2024\`
- Admin Panel: 192.168.1.1
- Router Password: p\`ComcastAdmin2024\`

Water - City Utilities
- Account: p\`WAT-123456789\`
- Online Access Code: p\`H2O2024secure\`

## Home Security
Alarm System - ADT
- Master Code: p\`1357\`
- Duress Code: p\`9753\`
- Service Account: p\`ADT-HOME-456789\`

Safe Combination: p\`15-35-25\`
Garage Door Code: p\`4682\`

## Rental Property
Tenant Portal
- Property ID: p\`PROP-789012\`
- Access Code: p\`Rental2024Access\`

## Warranty Information
Appliances Master List
- Refrigerator Serial: p\`RF2024-567890\`
- Washer/Dryer Codes: p\`WD-234567, WD-234568\``,
			},
		],
	},
]
