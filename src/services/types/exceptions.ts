export enum MimiriExceptionType {
	CannotDeleteWithSharedDescendant = 'cannot-delete-with-shared-descendant',
}

export class MimiriException extends Error {
	constructor(
		public type: MimiriExceptionType,
		public title: string,
		msg: string,
	) {
		super(msg)
	}
}
