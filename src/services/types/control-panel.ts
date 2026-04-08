import { $t, noteManager } from '../../global'
import { mimiriPlatform } from '../mimiri-platform'
import type { MimiriStore } from '../storage/mimiri-store'
import { settingsManager } from '../settings-manager'
import type { Guid } from './guid'
import type { MimerNote } from './mimer-note'
import { VirtualNote } from './virtual-note'
import { AccountType } from '../storage/type'

export const createControlPanelTree = (owner: MimiriStore, parent: MimerNote): MimerNote[] => {
	const showUpdate = !mimiriPlatform.isWeb || location.host === 'localhost:5173'
	const showPin =
		(mimiriPlatform.isElectron || location.host === 'localhost:5173') &&
		noteManager.state.accountType !== AccountType.None
	const showSubscription =
		mimiriPlatform.isDesktop &&
		noteManager.state.accountType !== AccountType.Local &&
		noteManager.state.accountType !== AccountType.None
	const showDevBlog = !settingsManager.disableDevBlog
	const showDebug = settingsManager.debugEnabled
	const isLocal = noteManager.state.accountType === AccountType.None

	const items = [
		...(showUpdate
			? [
					{
						id: 'settings-update' as Guid,
						title: $t('controlPanel.updates'),
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
						title: $t('controlPanel.devBlog'),
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
						title: $t('controlPanel.debug'),
						type: 'settings-debug',
						icon: 'bulb',
						children: [],
					},
				]
			: []),
		{
			id: 'settings-group' as Guid,
			title: $t('controlPanel.settings'),
			type: 'settings-general',
			icon: 'cog',
			children: [
				{
					id: 'settings-general' as Guid,
					title: $t('controlPanel.general'),
					type: 'settings-general',
					icon: 'cog',
					children: [],
				},
				{
					id: 'settings-fonts-colors' as Guid,
					title: $t('controlPanel.fonts'),
					type: 'settings-fonts-colors',
					icon: 'font',
					children: [],
				},
				...(showPin
					? [
							{
								id: 'settings-pin' as Guid,
								title: $t('controlPanel.pinCode'),
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
						title: $t('controlPanel.createAccount'),
						type: 'settings-create-account',
						icon: 'account',
						children: [],
					},
				]
			: [
					{
						id: 'settings-account' as Guid,
						title: $t('controlPanel.account'),
						type: noteManager.state.isAnonymous
							? 'settings-create-password'
							: noteManager.state.accountType === AccountType.Local
								? 'settings-upgrade'
								: 'settings-username',
						icon: 'account',
						children: [
							...(noteManager.state.accountType === AccountType.Local
								? [
										{
											id: 'settings-upgrade' as Guid,
											title: $t('controlPanel.connectCloud'),
											type: 'settings-upgrade',
											icon: 'account',
											children: [],
										},
									]
								: []),
							...(!noteManager.state.isAnonymous
								? [
										{
											id: 'settings-username' as Guid,
											title: $t('controlPanel.username'),
											type: 'settings-username',
											icon: 'account',
											children: [],
										},
										{
											id: 'settings-password' as Guid,
											title: $t('controlPanel.password'),
											type: 'settings-password',
											icon: 'account',
											children: [],
										},
									]
								: [
										{
											id: 'settings-create-password' as Guid,
											title: $t('controlPanel.createPassword'),
											type: 'settings-create-password',
											icon: 'account',
											children: [],
										},
									]),

							{
								id: 'settings-delete' as Guid,
								title: $t('controlPanel.delete'),
								type: 'settings-delete',
								icon: 'account',
								children: [],
							},
						],
					},
				]),
		...(showSubscription
			? [
					{
						id: 'settings-plan-group' as Guid,
						title: $t('controlPanel.plan'),
						type: 'settings-plan',
						icon: 'coins',
						children: [
							{
								id: 'settings-plan' as Guid,
								title: $t('controlPanel.currentPlan'),
								type: 'settings-plan',
								icon: 'coins',
								children: [],
							},
							{
								id: 'settings-billing-address' as Guid,
								title: $t('controlPanel.billingAddress'),
								type: 'settings-billing-address',
								icon: 'coins',
								children: [],
							},
							{
								id: 'settings-payment-methods' as Guid,
								title: $t('controlPanel.paymentMethods'),
								type: 'settings-payment-methods',
								icon: 'coins',
								children: [],
							},
							{
								id: 'settings-invoices' as Guid,
								title: $t('controlPanel.invoices'),
								type: 'settings-invoices',
								icon: 'coins',
								children: [],
							},
						],
					},
				]
			: []),
		// isLocal
		// 	? [
		// 			{
		// 				id: 'settings-explain-plan' as Guid,
		// 				title: 'Plan',
		// 				type: 'settings-explain-plan',
		// 				icon: 'coins',
		// 				children: [],
		// 			},
		// 		]
		// 	: []),
	]

	return items.map(tree => {
		const existing = owner.tree.getNoteById(tree.id)
		if (existing) {
			return existing
		}
		return new VirtualNote(owner, parent, tree)
	})
}
