import { Jimp } from 'jimp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const themes = ['dark', 'light'];
const mobileThemes = ['dark-mobile', 'light-mobile'];
const platforms = [
	{ name: 'windows', base: 'windows-base.png', lightBase: 'light-windows-base.png', mask: 'windows-mask.png' },
	{ name: 'linux', base: 'linux-base.png', lightBase: 'light-linux-base.png', mask: 'linux-mask.png' },
	{ name: 'mac', base: 'mac-base.png', lightBase: 'light-mac-base.png', mask: 'mac-mask.png' }
];

async function processDesktopScreenshots() {
	for (const theme of themes) {
		const screensDir = `screenshots/screens/${theme}`;
		const files = await readdir(screensDir);
		const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

		for (const imageFile of imageFiles) {
			console.log(`Processing desktop ${theme}/${imageFile}...`);

			for (const platform of platforms) {
				const baseImage = theme === 'light' ? platform.lightBase : platform.base;
				const base = await Jimp.read(`screenshots/${baseImage}`);
				const mask = await Jimp.read(`screenshots/${platform.mask}`);
				const shot = await Jimp.read(join(screensDir, imageFile));

				shot.mask(mask, 0, 0);   // apply mask in-place

				base.composite(shot, 0, 0);
				await base.write(`screenshots/${platform.name}/${theme}/${imageFile}`);
			}
		}
	}
}

async function processMobileScreenshots() {
	for (const mobileTheme of mobileThemes) {
		const screensDir = `screenshots/screens/${mobileTheme}`;
		const files = await readdir(screensDir);
		const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

		for (const imageFile of imageFiles) {
			console.log(`Processing mobile ${mobileTheme}/${imageFile}...`);

			// Determine the output theme folder (remove '-mobile' suffix)
			const outputTheme = mobileTheme.replace('-mobile', '');

			const base = await Jimp.read('screenshots/iphone-base.png');
			const mask = await Jimp.read('screenshots/iphone-mask.png');
			const shot = await Jimp.read(join(screensDir, imageFile));

			// Scale the screenshot up by 300%
			shot.scale(3.0);

			// Create a canvas the same size as the iPhone base
			const canvas = new Jimp({ width: base.bitmap.width, height: base.bitmap.height, color: 0x00000000 });

			// Calculate center position for the scaled screenshot within the iPhone base
			const baseWidth = base.bitmap.width;
			const baseHeight = base.bitmap.height;
			const shotWidth = shot.bitmap.width;
			const shotHeight = shot.bitmap.height;

			const x = Math.round((baseWidth - shotWidth) / 2);
			const y = Math.round((baseHeight - shotHeight) / 2);

			// First composite the scaled screenshot onto the canvas
			canvas.composite(shot, x, y);
			canvas.mask(mask, 0, 0);   // apply mask in-place
			// Then composite the iPhone frame on top
			canvas.composite(base, 0, 0);

			await canvas.write(`screenshots/ios/${outputTheme}/${imageFile}`);
		}
	}
}

async function processScreenshots() {
	await processDesktopScreenshots();
	await processMobileScreenshots();
}

await processScreenshots();