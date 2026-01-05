// Shared URL detection and processing utilities

// Base pattern for matching URLs (without anchors so it can be composed)
export const urlPatternBase = /(https?:\/\/[^\s<>\[\]()]+)/

// Trim trailing punctuation but preserve file extensions (e.g., .html, .pdf)
export const cleanUrl = (url: string): string => {
	while (url.length > 0 && /[.,;:!?'"]$/.test(url) && !/\.\w+$/.test(url)) {
		url = url.slice(0, -1)
	}
	return url
}
