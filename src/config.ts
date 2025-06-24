import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "42",
	subtitle: "Deep Thought",
	lang: "en", // 'en', 'zh_CN', 'zh_TW', 'ja', 'ko'
	themeColor: {
		hue: 145, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: true, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/banner3.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: true, // Display the credit text of the banner image
			text: "Rebecca Burnett", // Credit text to be displayed
			url: "https://unsplash.com/ko/%EC%82%AC%EC%A7%84/%EB%82%98%EB%AC%B4-%EC%9A%B8%ED%83%80%EB%A6%AC-%EC%9C%84%EC%97%90-%EC%84%9C-%EC%9E%88%EB%8A%94-%EA%B2%80%EC%9D%80-%EA%B3%A0%EC%96%91%EC%9D%B4-gmMsb9DYsiA", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
		{
			src: "/favicon/favicon.PNG", // Path of the favicon, relative to the /public directory
			// theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
			sizes: "32x32", // (Optional) Size of the favicon, set only if you have favicons of different sizes
		},
	],
	giscus: {
		repo: "punchdrunkard/punchdrunkard.github.io",
		repo_id: "R_kgDONCPRFA",
		category: "Comments",
		category_id: "DIC_kwDONCPRFM4CjwYQ",
		mapping: "pathname",
		strict: false,
		reactions_enabled: true,
		emit_metadata: false,
		input_position: "top",
		theme: "preferred_color_scheme",
		lang: "ko",
		loading: "lazy",
	},
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/punchdrunkard", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.JPG", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "42",
	bio: "qwlekjasdlkwqe",
	links: [
		// {
		//   name: 'Twitter',
		//   icon: 'fa6-brands:twitter',       // Visit https://icones.js.org/ for icon codes
		//                                     // You will need to install the corresponding icon set if it's not already included
		//                                     // `pnpm add @iconify-json/<icon-set-name>`
		//   url: 'https://twitter.com',
		// },
		// {
		//   name: 'Steam',
		//   icon: 'fa6-brands:steam',
		//   url: 'https://store.steampowered.com',
		// },
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/punchdrunkard",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
