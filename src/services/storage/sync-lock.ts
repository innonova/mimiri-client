export type LockType = 'shared' | 'exclusive'

interface LockRequest {
	type: LockType
	resolve: () => void
	reject: (error: Error) => void
}

export class SyncLock {
	private sharedCount = 0
	private exclusiveLocked = false
	private queue: LockRequest[] = []

	public async acquire(type: LockType = 'shared'): Promise<() => void> {
		if (this.canAcquire(type)) {
			if (type === 'shared') {
				this.sharedCount++
			} else {
				this.exclusiveLocked = true
			}
			return () => this.release(type)
		} else {
			return new Promise<() => void>((resolve, reject) => {
				const request: LockRequest = {
					type,
					resolve: () => {
						if (type === 'shared') {
							this.sharedCount++
						} else {
							this.exclusiveLocked = true
						}

						resolve(() => this.release(type))
					},
					reject,
				}
				this.queue.push(request)
			})
		}
	}

	public async withLock<T>(name: string, fn: () => Promise<T> | T, type: LockType = 'shared'): Promise<T> {
		// console.log(`Acquiring ${type} lock for ${name}`)
		const release = await this.acquire(type)
		// console.log(`Acquired ${type} lock for ${name}`)
		try {
			return await fn()
		} finally {
			release()
		}
	}

	private canAcquire(type: LockType): boolean {
		if (type === 'shared') {
			return !this.exclusiveLocked
		} else {
			return !this.exclusiveLocked && this.sharedCount === 0
		}
	}

	private release(type: LockType): void {
		if (type === 'shared') {
			this.sharedCount = Math.max(0, this.sharedCount - 1)
		} else {
			this.exclusiveLocked = false
		}

		this.processQueue()
	}

	private processQueue(): void {
		let i = 0
		while (i < this.queue.length) {
			const request = this.queue[i]

			if (this.canAcquire(request.type)) {
				this.queue.splice(i, 1)
				request.resolve()
				if (request.type === 'exclusive') {
					break
				}
			} else {
				i++
			}
		}
	}
}
