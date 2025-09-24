import { readdir, access, constants, writeFile } from 'fs/promises';

export async function generateGalleryHTML(basePath, themes, platforms) {
	if (!basePath) {
		throw new Error('basePath is required');
	}

	if (!themes || !Array.isArray(themes)) {
		throw new Error('themes array is required');
	}

	if (!platforms || !Array.isArray(platforms)) {
		throw new Error('platforms array is required');
	}

	// Initialize statistics
	let totalImages = 0;
	let platformCount = 0;
	let themeCount = themes.length;
	let sectionCounts = {
		desktop: 0,
		mobile: 0,
		cutouts: 0,
		appStore: 0
	};

	let html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Screenshot Gallery</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			margin: 0;
			padding: 20px;
			background: #f5f5f5;
		}
		.container {
			max-width: 1400px;
			margin: 0 auto;
		}
		h1 {
			text-align: center;
			color: #333;
			margin-bottom: 40px;
		}
		.platform-section {
			background: white;
			border-radius: 12px;
			padding: 30px;
			margin-bottom: 40px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
		}
		.platform-title {
			font-size: 28px;
			font-weight: bold;
			margin-bottom: 20px;
			color: #333;
			text-transform: capitalize;
		}
		.theme-section {
			margin-bottom: 30px;
		}
		.theme-title {
			font-size: 20px;
			font-weight: 600;
			margin-bottom: 15px;
			color: #666;
			text-transform: capitalize;
		}
		.screenshot-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
			gap: 20px;
			margin-bottom: 20px;
		}
		.screenshot-item {
			text-align: center;
		}
		.screenshot-item img {
			max-width: 100%;
			height: auto;
			border-radius: 8px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			transition: transform 0.2s ease;
		}
		.screenshot-item img:hover {
			transform: scale(1.02);
		}
		.screenshot-name {
			margin-top: 10px;
			font-size: 14px;
			color: #666;
		}
		.format-toggle {
			margin-bottom: 20px;
		}
		.format-toggle button {
			padding: 8px 16px;
			margin-right: 10px;
			border: 1px solid #ddd;
			background: white;
			border-radius: 6px;
			cursor: pointer;
			transition: all 0.2s ease;
		}
		.format-toggle button.active {
			background: #007acc;
			color: white;
			border-color: #007acc;
		}
		.format-toggle button:hover {
			background: #f0f0f0;
		}
		.format-toggle button.active:hover {
			background: #005c99;
		}
		.lightbox {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.9);
			z-index: 1000;
			cursor: pointer;
		}
		.lightbox.active {
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.lightbox img {
			max-width: 95%;
			max-height: 95%;
			object-fit: contain;
			box-shadow: 0 8px 32px rgba(0,0,0,0.3);
		}
		.lightbox-close {
			position: absolute;
			top: 20px;
			right: 30px;
			font-size: 40px;
			color: white;
			cursor: pointer;
			font-weight: bold;
			user-select: none;
		}
		.lightbox-close:hover {
			color: #ccc;
		}
		.lightbox-nav {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			font-size: 30px;
			color: white;
			cursor: pointer;
			font-weight: bold;
			user-select: none;
			padding: 10px 15px;
			background: rgba(0, 0, 0, 0.5);
			border-radius: 4px;
			transition: background 0.2s ease;
		}
		.lightbox-nav:hover {
			background: rgba(0, 0, 0, 0.8);
		}
		.lightbox-prev {
			left: 20px;
		}
		.lightbox-next {
			right: 20px;
		}
		.lightbox-counter {
			position: absolute;
			bottom: 20px;
			left: 50%;
			transform: translateX(-50%);
			color: white;
			font-size: 14px;
			background: rgba(0, 0, 0, 0.5);
			padding: 5px 15px;
			border-radius: 15px;
		}
		.screenshot-item img {
			cursor: pointer;
		}
		.stats-section {
			background: white;
			border-radius: 12px;
			padding: 25px;
			margin-bottom: 30px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
			text-align: center;
		}
		.stats-title {
			font-size: 20px;
			font-weight: 600;
			margin-bottom: 15px;
			color: #333;
		}
		.stats-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			gap: 15px;
		}
		.stat-item {
			background: #f8f9fa;
			padding: 15px;
			border-radius: 8px;
			border-left: 4px solid #007acc;
		}
		.stat-number {
			font-size: 28px;
			font-weight: bold;
			color: #007acc;
			margin-bottom: 5px;
		}
		.stat-label {
			font-size: 14px;
			color: #666;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Screenshot Gallery</h1>
		<div class="format-toggle">
			<button class="active" onclick="showFormat('webp')">WebP</button>
		<button onclick="showFormat('png')">PNG</button>
		</div>
		<div class="stats-section" id="stats-section">
			<div class="stats-title">Gallery Statistics</div>
			<div class="stats-grid">
				<div class="stat-item">
					<div class="stat-number" id="total-images">0</div>
					<div class="stat-label">Total Images</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" id="platform-count">0</div>
					<div class="stat-label">Platforms</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" id="theme-count">${themeCount}</div>
					<div class="stat-label">Themes</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" id="desktop-count">0</div>
					<div class="stat-label">Desktop</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" id="mobile-count">0</div>
					<div class="stat-label">Mobile</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" id="cutouts-count">0</div>
					<div class="stat-label">Cutouts</div>
				</div>
				<div class="stat-item">
					<div class="stat-number" id="appstore-count">0</div>
					<div class="stat-label">App Store</div>
				</div>
			</div>
		</div>
`;	// Desktop platforms
	platformCount = platforms.length;
	for (const platform of platforms) {
		html += `		<div class="platform-section">
			<div class="platform-title">${platform.name}</div>
`;

		for (const theme of themes) {
			const platformDir = `${basePath}/${platform.name}/${theme}`;
			try {
				await access(platformDir, constants.F_OK);
				const files = await readdir(platformDir);
				const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

				if (imageFiles.length > 0) {
					totalImages += imageFiles.length;
					sectionCounts.desktop += imageFiles.length;
					html += `			<div class="theme-section">
				<div class="theme-title">${theme}</div>
				<div class="screenshot-grid">
`;

					for (const imageFile of imageFiles.sort()) {
						const webpFile = imageFile.replace(/\.png$/i, '.webp');
						html += `					<div class="screenshot-item">
						<img src="${platform.name}/${theme}/${webpFile}"
							 data-png="${platform.name}/${theme}/${imageFile}"
							 data-webp="${platform.name}/${theme}/${webpFile}"
							 alt="${imageFile}"
							 onclick="openLightbox(this)">
						<div class="screenshot-name">${imageFile.replace('.png', '')}</div>
					</div>
`;
					}

					html += `				</div>
			</div>
`;
				}
			} catch (error) {
				// Directory doesn't exist, skip
			}
		}

		html += `		</div>
`;
	}

	// Mobile (iPhone)
	html += `		<div class="platform-section">
			<div class="platform-title">iPhone</div>
`;

	for (const theme of themes) {
		const mobileDir = `${basePath}/iphone/${theme}`;
		try {
			await access(mobileDir, constants.F_OK);
			const files = await readdir(mobileDir);
			const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

			if (imageFiles.length > 0) {
				totalImages += imageFiles.length;
				sectionCounts.mobile += imageFiles.length;

				html += `			<div class="theme-section">
				<div class="theme-title">${theme}</div>
				<div class="screenshot-grid">
`;

				for (const imageFile of imageFiles.sort()) {
					const webpFile = imageFile.replace(/\.png$/i, '.webp');
					html += `					<div class="screenshot-item">
						<img src="iphone/${theme}/${webpFile}"
							 data-png="iphone/${theme}/${imageFile}"
							 data-webp="iphone/${theme}/${webpFile}"
							 alt="${imageFile}"
							 onclick="openLightbox(this)">
						<div class="screenshot-name">${imageFile.replace('.png', '')}</div>
					</div>
`;
				}

				html += `				</div>
			</div>
`;
			}
		} catch (error) {
			// Directory doesn't exist, skip
		}
	}

	html += `		</div>
`;

	// Cutouts
	html += `		<div class="platform-section">
			<div class="platform-title">Cutouts</div>
`;

	for (const theme of themes) {
		const cutoutDir = `${basePath}/cutouts/${theme}`;
		try {
			await access(cutoutDir, constants.F_OK);
			const files = await readdir(cutoutDir);
			const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

			if (imageFiles.length > 0) {
				totalImages += imageFiles.length;
				sectionCounts.cutouts += imageFiles.length;

				html += `			<div class="theme-section">
				<div class="theme-title">${theme}</div>
				<div class="screenshot-grid">
`;

				for (const imageFile of imageFiles.sort()) {
					const webpFile = imageFile.replace(/\.png$/i, '.webp');
					html += `					<div class="screenshot-item">
						<img src="cutouts/${theme}/${webpFile}"
							 data-png="cutouts/${theme}/${imageFile}"
							 data-webp="cutouts/${theme}/${webpFile}"
							 alt="${imageFile}"
							 onclick="openLightbox(this)">
						<div class="screenshot-name">${imageFile.replace('.png', '')}</div>
					</div>
`;
				}

				html += `				</div>
			</div>
`;
			}
		} catch (error) {
			// Directory doesn't exist, skip
		}
	}

	html += `		</div>
`;

	// App Store screenshots
	const appStoreDevices = ['iphone', 'ipad', 'android', 'tablet-10', 'tablet-7'];

	html += `		<div class="platform-section">
			<div class="platform-title">App Store Screenshots</div>
`;

	for (const device of appStoreDevices) {
		html += `			<div class="theme-section">
				<div class="theme-title">${device}</div>
`;

		for (const theme of themes) {
			const storeDir = `${basePath}/app-store/${device}/${theme}`;
			try {
				await access(storeDir, constants.F_OK);
				const files = await readdir(storeDir);
				const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

				if (imageFiles.length > 0) {
					totalImages += imageFiles.length;
					sectionCounts.appStore += imageFiles.length;

					html += `				<div style="margin-bottom: 15px;">
					<strong style="color: #888; font-size: 16px;">${theme}</strong>
					<div class="screenshot-grid" style="margin-top: 10px;">
`;

					for (const imageFile of imageFiles.sort()) {
						const webpFile = imageFile.replace(/\.png$/i, '.webp');
						html += `						<div class="screenshot-item">
							<img src="app-store/${device}/${theme}/${webpFile}"
								 data-png="app-store/${device}/${theme}/${imageFile}"
								 data-webp="app-store/${device}/${theme}/${webpFile}"
								 alt="${imageFile}"
								 onclick="openLightbox(this)">
							<div class="screenshot-name">${imageFile.replace('.png', '')}</div>
						</div>
`;
					}

					html += `					</div>
				</div>
`;
				}
			} catch (error) {
				// Directory doesn't exist, skip
			}
		}

		html += `			</div>
`;
	}

	html += `		</div>

	<!-- Lightbox Modal -->
	<div class="lightbox" id="lightbox" onclick="closeLightbox()">
		<span class="lightbox-close">&times;</span>
		<span class="lightbox-nav lightbox-prev" onclick="navigateLightbox(-1, event)">❮</span>
		<span class="lightbox-nav lightbox-next" onclick="navigateLightbox(1, event)">❯</span>
		<img id="lightbox-img" src="" alt="">
		<div class="lightbox-counter" id="lightbox-counter">1 / 1</div>
	</div>

	</div>
	<script>
		function showFormat(format) {
			const buttons = document.querySelectorAll('.format-toggle button');
			const images = document.querySelectorAll('.screenshot-item img');

			buttons.forEach(btn => btn.classList.remove('active'));
			event.target.classList.add('active');

			images.forEach(img => {
				if (format === 'webp') {
					img.src = img.dataset.webp;
				} else {
					img.src = img.dataset.png;
				}
			});

			// Update lightbox image if it's open
			const lightboxImg = document.getElementById('lightbox-img');
			const lightbox = document.getElementById('lightbox');
			if (lightbox.classList.contains('active')) {
				if (format === 'webp') {
					lightboxImg.src = lightboxImg.dataset.webp;
				} else {
					lightboxImg.src = lightboxImg.dataset.png;
				}
			}
		}

		let currentImageGroup = [];
		let currentImageIndex = 0;

		function getImageGroup(clickedImg) {
			// Find the parent screenshot grid
			const grid = clickedImg.closest('.screenshot-grid');
			if (!grid) return [clickedImg];

			// Get all images in the same grid
			return Array.from(grid.querySelectorAll('.screenshot-item img'));
		}

		function updateLightboxImage() {
			const lightboxImg = document.getElementById('lightbox-img');
			const lightboxCounter = document.getElementById('lightbox-counter');
			const currentImg = currentImageGroup[currentImageIndex];

			// Determine current format
			const isWebP = document.querySelector('.format-toggle button.active').textContent === 'WebP';

			lightboxImg.src = isWebP ? currentImg.dataset.webp : currentImg.dataset.png;
			lightboxImg.alt = currentImg.alt;
			lightboxImg.dataset.png = currentImg.dataset.png;
			lightboxImg.dataset.webp = currentImg.dataset.webp;

			lightboxCounter.textContent = \`\${currentImageIndex + 1} / \${currentImageGroup.length}\`;
		}

		function openLightbox(img) {
			currentImageGroup = getImageGroup(img);
			currentImageIndex = currentImageGroup.indexOf(img);

			const lightbox = document.getElementById('lightbox');
			updateLightboxImage();

			lightbox.classList.add('active');
			document.body.style.overflow = 'hidden';
		}

		function navigateLightbox(direction, event) {
			event.stopPropagation();

			currentImageIndex += direction;

			// Wrap around
			if (currentImageIndex < 0) {
				currentImageIndex = currentImageGroup.length - 1;
			} else if (currentImageIndex >= currentImageGroup.length) {
				currentImageIndex = 0;
			}

			updateLightboxImage();
		}

		function closeLightbox() {
			const lightbox = document.getElementById('lightbox');
			lightbox.classList.remove('active');
			document.body.style.overflow = 'auto';
			currentImageGroup = [];
			currentImageIndex = 0;
		}

		// Keyboard and click navigation
		document.addEventListener('keydown', function(e) {
			const lightbox = document.getElementById('lightbox');
			if (!lightbox.classList.contains('active')) return;

			if (e.key === 'Escape') {
				closeLightbox();
			} else if (e.key === 'ArrowLeft') {
				navigateLightbox(-1, e);
			} else if (e.key === 'ArrowRight') {
				navigateLightbox(1, e);
			}
		});

		// Prevent lightbox from closing when clicking on interactive elements
		document.getElementById('lightbox-img').addEventListener('click', function(e) {
			e.stopPropagation();
		});

		document.querySelector('.lightbox-close').addEventListener('click', function(e) {
			e.stopPropagation();
			closeLightbox();
		});

		// Update statistics
		document.getElementById('total-images').textContent = '${totalImages}';
		document.getElementById('platform-count').textContent = '${platformCount + 1}';
		document.getElementById('desktop-count').textContent = '${sectionCounts.desktop}';
		document.getElementById('mobile-count').textContent = '${sectionCounts.mobile}';
		document.getElementById('cutouts-count').textContent = '${sectionCounts.cutouts}';
		document.getElementById('appstore-count').textContent = '${sectionCounts.appStore}';
	</script>

</body>
</html>`;

	// Write the HTML file
	await writeFile(`${basePath}/gallery.html`, html, 'utf8');
	console.log(`Generated gallery.html at ${basePath}/gallery.html`);
}