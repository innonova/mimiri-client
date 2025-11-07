import shell from 'shelljs';
import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import Path from "path";
import { chromium } from 'playwright';

const run = async () => {
	const cwd = process.cwd()
	const jsonFile = Path.join(cwd, 'src/icons.json')
	const remix = Path.join(cwd, 'src/icons.remix')
	const dest = Path.join(cwd, 'src/icons')
	const cache = Path.join(cwd, 'src/icons.cache')
	const browserDataDir = Path.join(cwd, '.playwright-profile')

	shell.mkdir('-p', cache)
	shell.mkdir('-p', browserDataDir)

	const json = JSON.parse(readFileSync(jsonFile))

	const attributionMap = {}

	// Use persistent context to maintain cookies and session across runs
	console.log('Launching browser with persistent profile...');
	const context = await chromium.launchPersistentContext(browserDataDir, {
		headless: false,
		args: [
			'--disable-blink-features=AutomationControlled',
		],
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		viewport: { width: 1920, height: 1080 },
	});

	// Use the first page that's already open (persistent context creates one)
	const page = context.pages()[0] || await context.newPage();

	// Test with first URL to handle verification once
	const firstNonRemixKey = Object.keys(json).find(key => !json[key].remix);
	if (firstNonRemixKey) {
		const firstUrl = json[firstNonRemixKey].url;
		console.log('\nTesting first URL:', firstUrl);

		try {
			await page.goto(firstUrl, { waitUntil: 'load', timeout: 30000 });
			await page.waitForTimeout(2000);

			const content = await page.content();

			// Check if it's actually an SVG or if we got a verification page
			const isSvg = content.includes('<svg') && !content.includes('<!DOCTYPE html>');
			const needsVerification = content.includes('verify') || content.includes('challenge') || content.includes('security');

			if (!isSvg || needsVerification) {
				console.log('\n⚠️  Verification required! Please complete it in the browser window.');
				console.log('Once the SVG loads (you should see XML text starting with <svg), press Enter...\n');

				// Wait for user to press Enter
				await new Promise(resolve => {
					const stdin = process.stdin;
					stdin.setRawMode(false);
					stdin.resume();
					stdin.once('data', () => {
						stdin.pause();
						resolve();
					});
				});
			} else {
				console.log('✓ First icon loaded successfully, no verification needed');
			}
		} catch (e) {
			console.log('Note: Initial test failed, continuing anyway...');
		}

		console.log('✓ Starting downloads...\n');
	}

	for (const key of Object.keys(json)) {
		console.log(key);
		let icon = ''
		const iconObj = json[key]
		if (iconObj.attribution) {
			attributionMap[iconObj.attribution] = 0
		}
		if (iconObj.remix) {
			icon = readFileSync(Path.join(remix, iconObj.remix)).toString();
		} else {
			const url = iconObj.url
			const cacheName = url.replaceAll(/https?:\/\//g, '').replaceAll(/[\/:]/g, '_')
			const cachePath = Path.join(cache, cacheName)
			if (!existsSync(cachePath)) {
				try {
					console.log(`Downloading ${url}...`);

					// Small delay between requests
					await page.waitForTimeout(300 + Math.random() * 500);

					// Try using API request with browser cookies first (faster)
					try {
						const apiContext = context.request;
						const response = await apiContext.get(url, { timeout: 30000 });

						if (response.ok()) {
							const content = await response.text();

							// Check if we got SVG or HTML
							if (content.includes('<svg') && !content.includes('<!DOCTYPE html>')) {
								writeFileSync(cachePath, content);
								console.log(`✓ Downloaded ${key} via API`);
							} else {
								throw new Error('Got HTML instead of SVG');
							}
						} else {
							throw new Error(`Status ${response.status()}`);
						}
					} catch (apiError) {
						// Fallback to page navigation
						console.log(`API failed for ${key}, trying page navigation...`);
						const response = await page.goto(url, {
							waitUntil: 'domcontentloaded',
							timeout: 30000
						});

						await page.waitForTimeout(1000);

						if (response && response.ok()) {
							const content = await page.content();

							// Check if we got HTML instead of SVG
							if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
								console.warn(`\n WARNING: Received HTML page instead of SVG for ${key}. Verification may be required.\n`);
								shell.rm('-f', cachePath);
								continue;
							}

							writeFileSync(cachePath, content);
							console.log(`✓ Downloaded ${key} via page`);
						} else {
							console.warn(`\n WARNING: Failed to download icon ${key} from ${url} (status: ${response?.status()})\n`);
							continue;
						}
					}
				} catch (error) {
					console.warn(`\n WARNING: Error downloading icon ${key} from ${url}: ${error.message}\n`);
					continue;
				}
			}
			icon = readFileSync(cachePath).toString();
			if (icon.includes('<!DOCTYPE html>')) {
				console.warn(`\n WARNING: Icon ${key} could not be downloaded from ${url}\n`);
				shell.rm('-f', cachePath)
				continue
			}
		}

		icon = icon.replace(/<\?xml[^>]+>/, '')
		icon = icon.replace(/<sodipodi:namedview[^>]+>/, '')
		icon = icon.replace(/<defs[^>]+>/, '')
		icon = icon.replaceAll(/sodipodi:[a-z]+="[^"]+"/g, '')
		icon = icon.replaceAll(/xmlns:sodipodi="[^"]+"/g, '')
		icon = icon.replaceAll(/inkscape:[a-z]+="[^"]+"/g, '')
		icon = icon.replaceAll(/xmlns:inkscape="[^"]+"/g, '')
		icon = icon.replace(`<!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->`, '')
		icon = icon.replace(`width="800px"`, 'width="100%"')
		icon = icon.replace(`height="800px"`, 'height="100%"')
		icon = icon.replaceAll(/#[0-9A-Fa-f]{6}/g, 'currentColor')
		icon = icon.replaceAll(/\n\s+\n/g, '\n')
		icon = icon.replaceAll(/\s+\/>/g, ' />')

		const customizableIcon = `<template>
	<div>
${icon.trim()}
	</div>
</template>`;
		const destPath = Path.join(dest, `${key}.vue`);
		writeFileSync(destPath, customizableIcon);


	}

	// Close the context after all downloads
	await context.close();

	const attributions = []
	for (const key of Object.keys(attributionMap)) {
		attributions.push(key)
	}
	writeFileSync(Path.join(dest, `attributions.ts`), `export const iconAttributions = ${JSON.stringify(attributions, undefined, '  ')}`);

}

run().then(() => {
	console.log('Icons generated');
	process.exit(0);
}).catch((err) => {
	console.error('Error generating icons', err);
	process.exit(1);
});


