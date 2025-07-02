import { noteManager } from '../../global'
import { mimiriPlatform } from '../mimiri-platform'
import type { MimiriStore } from '../storage/mimiri-store'
import { settingsManager } from '../settings-manager'
import type { Guid } from './guid'
import type { MimerNote } from './mimer-note'
import { VirtualNote } from './virtual-note'

export const createControlPanelTree = (owner: MimiriStore, parent: MimerNote): MimerNote[] => {
	const showUpdate = !mimiriPlatform.isWeb || location.host === 'localhost:5173'
	const showPin = (mimiriPlatform.isElectron || location.host === 'localhost:5173') && !noteManager.state.isLocal
	const showSubscription = mimiriPlatform.isDesktop
	const showDevBlog = !settingsManager.disableDevBlog
	const showDebug = settingsManager.debugEnabled
	const isLocal = noteManager.state.isLocal

	const items = [
		...(showUpdate
			? [
					{
						id: 'settings-update' as Guid,
						title: 'Updates',
						type: 'settings-update',
						icon: 'download',
						children: [],
					},
				]
			: []),
		...(showDevBlog
			? [
					{
						id: 'settings-blog' as Guid,
						title: 'Dev Blog',
						type: 'settings-blog',
						icon: 'announcement',
						children: [],
					},
				]
			: []),
		...(showDebug
			? [
					{
						id: 'settings-debug' as Guid,
						title: 'Debug',
						type: 'settings-debug',
						icon: 'bulb',
						children: [],
					},
				]
			: []),
		{
			id: 'settings-group' as Guid,
			title: 'Settings',
			type: 'settings-general',
			icon: 'cog',
			children: [
				{
					id: 'settings-general' as Guid,
					title: 'General',
					type: 'settings-general',
					icon: 'cog',
					children: [],
				},
				{
					id: 'settings-fonts-colors' as Guid,
					title: 'Fonts',
					type: 'settings-fonts-colors',
					icon: 'font',
					children: [],
				},
				...(showPin
					? [
							{
								id: 'settings-pin' as Guid,
								title: 'PIN Code',
								type: 'settings-pin',
								icon: 'lock',
								children: [],
							},
						]
					: []),
			],
		},
		...(isLocal
			? [
					{
						id: 'settings-create-account' as Guid,
						title: 'Create Account',
						type: 'settings-create-account',
						icon: 'account',
						children: [],
					},
				]
			: [
					{
						id: 'settings-account' as Guid,
						title: 'Account',
						type: noteManager.isAnonymous
							? 'settings-create-password'
							: noteManager.state.isLocalOnly
								? 'settings-upgrade'
								: 'settings-username',
						icon: 'account',
						children: [
							...(noteManager.state.isLocalOnly
								? [
										{
											id: 'settings-upgrade' as Guid,
											title: 'Connect Cloud',
											type: 'settings-upgrade',
											icon: 'account',
											children: [],
										},
									]
								: []),
							...(!noteManager.isAnonymous
								? [
										{
											id: 'settings-username' as Guid,
											title: 'Username',
											type: 'settings-username',
											icon: 'account',
											children: [],
										},
										{
											id: 'settings-password' as Guid,
											title: 'Password',
											type: 'settings-password',
											icon: 'account',
											children: [],
										},
									]
								: [
										{
											id: 'settings-create-password' as Guid,
											title: 'Create Password',
											type: 'settings-create-password',
											icon: 'account',
											children: [],
										},
									]),

							{
								id: 'settings-delete' as Guid,
								title: 'Delete',
								type: 'settings-delete',
								icon: 'account',
								children: [],
							},
						],
					},
				]),
		...(showSubscription && !isLocal
			? [
					{
						id: 'settings-plan-group' as Guid,
						title: 'Plan',
						type: 'settings-plan',
						icon: 'coins',
						children: [
							{
								id: 'settings-plan' as Guid,
								title: 'Current Plan',
								type: 'settings-plan',
								icon: 'coins',
								children: [],
							},
							{
								id: 'settings-billing-address' as Guid,
								title: 'Billing Address',
								type: 'settings-billing-address',
								icon: 'coins',
								children: [],
							},
							{
								id: 'settings-payment-methods' as Guid,
								title: 'Payment Methods',
								type: 'settings-payment-methods',
								icon: 'coins',
								children: [],
							},
							{
								id: 'settings-invoices' as Guid,
								title: 'Invoices',
								type: 'settings-invoices',
								icon: 'coins',
								children: [],
							},
						],
					},
				]
			: isLocal
				? [
						{
							id: 'settings-explain-plan' as Guid,
							title: 'Plan',
							type: 'settings-explain-plan',
							icon: 'coins',
							children: [],
						},
					]
				: []),
	]

	return items.map(tree => {
		const existing = owner.getNoteById(tree.id)
		if (existing) {
			return existing
		}
		return new VirtualNote(owner, parent, tree)
	})
}
