import { Jimp } from 'jimp';
import { readdir, mkdir, access, constants, readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import 'dotenv/config'
const themes = ['dark', 'light'];
const mobileThemes = ['dark-mobile', 'light-mobile'];
const cutoutThemes = ['dark-cutouts', 'light-cutouts'];
const platforms = [
	{ name: 'windows', base: 'windows-base.png', lightBase: 'light-windows-base.png', mask: 'windows-mask.png' },
	{ name: 'linux', base: 'linux-base.png', lightBase: 'light-linux-base.png', mask: 'linux-mask.png' },
	{ name: 'mac', base: 'mac-base.png', lightBase: 'light-mac-base.png', mask: 'mac-mask.png' }
];

async function processDesktopScreenshots() {
	for (const theme of themes) {
		const screensDir = `${process.env.SCREENSHOT_WORK_PATH}/screens/${theme}`;
		const files = await readdir(screensDir);
		const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

		for (const imageFile of imageFiles) {
			console.log(`Processing desktop ${theme}/${imageFile}...`);

			for (const platform of platforms) {
				const baseImage = theme === 'light' ? platform.lightBase : platform.base;
				const base = await Jimp.read(`${process.env.SCREENSHOT_WORK_PATH}/${baseImage}`);
				const mask = await Jimp.read(`${process.env.SCREENSHOT_WORK_PATH}/${platform.mask}`);
				const shot = await Jimp.read(join(screensDir, imageFile));

				shot.mask(mask, 0, 0);   // apply mask in-place

				base.composite(shot, 0, 0);

				// Save as PNG
				await base.write(`${process.env.SCREENSHOT_PUBLIC_PATH}/${platform.name}/${theme}/${imageFile}`);

				// Save as WebP using Sharp
				const webpFilename = imageFile.replace(/\.png$/i, '.webp');
				const pngBuffer = await base.getBuffer('image/png');
				await sharp(pngBuffer)
					.webp({ quality: 80 })
					.toFile(`${process.env.SCREENSHOT_PUBLIC_PATH}/${platform.name}/${theme}/${webpFilename}`);
			}
		}
	}
}

async function processMobileScreenshots() {
	for (const mobileTheme of mobileThemes) {
		const screensDir = `${process.env.SCREENSHOT_WORK_PATH}/screens/${mobileTheme}`;
		const files = await readdir(screensDir);
		const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

		for (const imageFile of imageFiles) {
			console.log(`Processing mobile ${mobileTheme}/${imageFile}...`);

			// Determine the output theme folder (remove '-mobile' suffix)
			const outputTheme = mobileTheme.replace('-mobile', '');

			const base = await Jimp.read(`${process.env.SCREENSHOT_WORK_PATH}/iphone-base.png`);
			const mask = await Jimp.read(`${process.env.SCREENSHOT_WORK_PATH}/iphone-mask.png`);
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

			// Save as PNG
			await canvas.write(`${process.env.SCREENSHOT_PUBLIC_PATH}/iphone/${outputTheme}/${imageFile}`);

			// Save as WebP using Sharp
			const webpFilename = imageFile.replace(/\.png$/i, '.webp');
			const pngBuffer = await canvas.getBuffer('image/png');
			await sharp(pngBuffer)
				.webp({ quality: 80 })
				.toFile(`${process.env.SCREENSHOT_PUBLIC_PATH}/iphone/${outputTheme}/${webpFilename}`);
		}
	}
}

async function processCutouts() {
	for (const cutoutTheme of cutoutThemes) {
		const screensDir = `${process.env.SCREENSHOT_WORK_PATH}/screens/${cutoutTheme}`;
		const files = await readdir(screensDir);
		const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

		for (const imageFile of imageFiles) {
			console.log(`Processing cutout ${cutoutTheme}/${imageFile}...`);
			const outputTheme = cutoutTheme.replace('-cutouts', '');

			try {
				const image = await Jimp.read(join(screensDir, imageFile));

				// Save as PNG
				await image.write(`${process.env.SCREENSHOT_PUBLIC_PATH}/cutouts/${outputTheme}/${imageFile}`);

				// Save as WebP using Sharp
				const webpFilename = imageFile.replace(/\.png$/i, '.webp');
				const pngBuffer = await image.getBuffer('image/png');
				await sharp(pngBuffer)
					.webp({ quality: 80 })
					.toFile(`${process.env.SCREENSHOT_PUBLIC_PATH}/cutouts/${outputTheme}/${webpFilename}`);
			} catch (error) {
				console.error(`Error processing cutout ${imageFile}: ${error.message}`);
			}
		}
	}
}

async function ensureDirectoriesExist() {
	const basePath = process.env.SCREENSHOT_PUBLIC_PATH;

	// Validate that SCREENSHOT_PUBLIC_PATH is configured
	if (!basePath) {
		throw new Error('SCREENSHOT_PUBLIC_PATH environment variable is not set');
	}

	// Validate that the base path exists
	try {
		await access(basePath, constants.F_OK);
	} catch (error) {
		throw new Error(`SCREENSHOT_PUBLIC_PATH directory does not exist: ${basePath}`);
	}

	// Create directories for desktop platforms and themes
	for (const platform of platforms) {
		for (const theme of themes) {
			await mkdir(`${basePath}/${platform.name}/${theme}`, { recursive: true });
		}
	}

	// Create directories for mobile themes
	for (const mobileTheme of mobileThemes) {
		const outputTheme = mobileTheme.replace('-mobile', '');
		await mkdir(`${basePath}/iphone/${outputTheme}`, { recursive: true });
	}

	// Create directories for cutouts
	for (const cutoutTheme of cutoutThemes) {
		const outputTheme = cutoutTheme.replace('-cutouts', '');
		await mkdir(`${basePath}/cutouts/${outputTheme}`, { recursive: true });
	}
}

async function processScreenshots() {
	await ensureDirectoriesExist();

	await processDesktopScreenshots();
	await processMobileScreenshots();
	await processCutouts();
}

await processScreenshots();