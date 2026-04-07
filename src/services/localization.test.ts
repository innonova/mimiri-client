import { describe, it, expect, beforeEach } from '@jest/globals'
import { LocalizationProvider, type LocaleData } from './localization'

const enLocale: LocaleData = {
	common: {
		ok: 'OK',
		cancel: 'Cancel',
		delete: 'Delete',
		close: 'Close',
	},
	acceptShareDialog: {
		title: 'Accept Share',
		enterCode: 'Enter the one time code to accept a share.',
		noShareFound: 'No share found',
		cannotAcceptNoteCount: 'Cannot accept share!\nNew note count ({count}) would exceed current maximum ({max})',
		cannotAcceptDataUsage: 'Cannot accept share!\nNew data usage ({size}) would exceed current maximum ({max})',
		limitExceeded: 'Limit exceeded: {message}',
	},
	shareDialog: {
		title: 'Share Note',
		instruction: 'Share this one time code with {name} to complete the share of {noteName}',
		_comment: 'Shown after a share code has been generated',
	},
	deleteNodeDialog: {
		title: 'Delete Note',
		confirm: 'Are you sure you want to delete:',
		leaveShareTitle: 'Leave Share',
		remainsAccessibleTo: 'This note will remain be accessible to:',
	},
}

const zhLocale: LocaleData = {
	common: {
		ok: '确定',
		cancel: '取消',
	},
	acceptShareDialog: {
		title: '接受分享',
		noShareFound: '未找到分享',
	},
}

describe('LocalizationProvider', () => {
	let provider: LocalizationProvider

	beforeEach(() => {
		provider = new LocalizationProvider()
		provider.register('en', enLocale)
		provider.register('zh', zhLocale)
		provider.setFallbackLocale('en')
		provider.setLocale('en')
	})

	describe('t()', () => {
		it('returns a top-level string value', () => {
			expect(provider.t('common.ok')).toBe('OK')
		})

		it('returns a deeply nested string value', () => {
			expect(provider.t('acceptShareDialog.enterCode')).toBe('Enter the one time code to accept a share.')
		})

		it('returns the key itself when the key is not found', () => {
			expect(provider.t('common.doesNotExist')).toBe('common.doesNotExist')
		})

		it('returns the key itself when the namespace is not found', () => {
			expect(provider.t('nonexistent.key')).toBe('nonexistent.key')
		})

		it('interpolates single placeholder', () => {
			expect(provider.t('acceptShareDialog.limitExceeded', { message: 'quota reached' })).toBe(
				'Limit exceeded: quota reached',
			)
		})

		it('interpolates multiple placeholders', () => {
			expect(provider.t('acceptShareDialog.cannotAcceptNoteCount', { count: 150, max: 100 })).toBe(
				'Cannot accept share!\nNew note count (150) would exceed current maximum (100)',
			)
		})

		it('interpolates two placeholders in share instruction', () => {
			expect(provider.t('shareDialog.instruction', { name: 'alice', noteName: 'My Notes' })).toBe(
				'Share this one time code with alice to complete the share of My Notes',
			)
		})

		it('leaves unknown placeholders unchanged', () => {
			expect(provider.t('acceptShareDialog.cannotAcceptNoteCount')).toBe(
				'Cannot accept share!\nNew note count ({count}) would exceed current maximum ({max})',
			)
		})

		it('treats _comment keys as regular strings', () => {
			expect(provider.t('shareDialog._comment')).toBe('Shown after a share code has been generated')
		})

		it('returns key when resolving an intermediate object node', () => {
			expect(provider.t('common')).toBe('common')
		})
	})

	describe('has()', () => {
		it('returns true for an existing key', () => {
			expect(provider.has('common.ok')).toBe(true)
		})

		it('returns false for a missing key', () => {
			expect(provider.has('common.nonexistent')).toBe(false)
		})

		it('returns false for intermediate object nodes', () => {
			expect(provider.has('common')).toBe(false)
		})

		it('returns true for _comment keys', () => {
			expect(provider.has('shareDialog._comment')).toBe(true)
		})
	})

	describe('fallback locale', () => {
		beforeEach(() => {
			provider.setLocale('zh')
		})

		it('returns the current locale value when key exists in it', () => {
			expect(provider.t('common.ok')).toBe('确定')
		})

		it('falls back to the fallback locale when key is missing in current locale', () => {
			expect(provider.t('common.delete')).toBe('Delete')
		})

		it('falls back for deeply nested keys', () => {
			expect(provider.t('acceptShareDialog.enterCode')).toBe('Enter the one time code to accept a share.')
		})

		it('has() returns true for keys only in fallback locale', () => {
			expect(provider.has('common.delete')).toBe(true)
		})
	})

	describe('setLocale() and currentLocale', () => {
		it('reports the current locale', () => {
			provider.setLocale('zh')
			expect(provider.currentLocale).toBe('zh')
		})

		it('reports the fallback locale', () => {
			provider.setFallbackLocale('zh')
			expect(provider.fallbackLocale).toBe('zh')
		})
	})

	describe('unregistered locale', () => {
		it('falls back gracefully when the current locale has no registered data', () => {
			provider.setLocale('fr')
			expect(provider.t('common.ok')).toBe('OK')
		})
	})
})
