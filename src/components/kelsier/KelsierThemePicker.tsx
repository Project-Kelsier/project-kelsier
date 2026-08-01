import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "kelsier-color-theme";
const DEFAULT_THEME = "ember";

const KELSIER_THEMES = [
	{ id: "ember", label: "Ember gold" },
	{ id: "phthalo", label: "Phthalo green" },
	{ id: "coral", label: "Signal coral" },
	{ id: "acid", label: "Acid ink" },
] as const;

type KelsierTheme = (typeof KELSIER_THEMES)[number]["id"];

function isKelsierTheme(value: string | null): value is KelsierTheme {
	return KELSIER_THEMES.some((theme) => theme.id === value);
}

function applyTheme(theme: KelsierTheme) {
	document.documentElement.dataset.kelsierTheme = theme;
}

function readStoredTheme() {
	try {
		const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
		if (storedTheme === "ocean") {
			return "phthalo";
		}
		if (storedTheme === "mineral") {
			return DEFAULT_THEME;
		}
		return isKelsierTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
	} catch {
		return DEFAULT_THEME;
	}
}

function storeTheme(theme: KelsierTheme) {
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Theme switching still works when storage is unavailable.
	}
}

export function KelsierThemePicker() {
	const [theme, setTheme] = useState<KelsierTheme>(DEFAULT_THEME);

	useEffect(() => {
		const initialTheme = readStoredTheme();

		setTheme(initialTheme);
		applyTheme(initialTheme);
		storeTheme(initialTheme);
	}, []);

	const selectTheme = (nextTheme: KelsierTheme) => {
		setTheme(nextTheme);
		applyTheme(nextTheme);
		storeTheme(nextTheme);
	};

	return (
		<label className="k-theme-picker">
			<span className="k-theme-picker__label">Theme</span>
			<span className="k-theme-picker__swatch" aria-hidden="true" />
			<select
				aria-label="Color theme"
				className="k-theme-picker__select"
				value={theme}
				onChange={(event) => {
					const nextTheme = event.target.value;
					if (isKelsierTheme(nextTheme)) {
						selectTheme(nextTheme);
					}
				}}
			>
				{KELSIER_THEMES.map((option) => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}
