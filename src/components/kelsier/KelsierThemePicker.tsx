import { useEffect, useState } from "react";
import {
	DEFAULT_KELSIER_THEME,
	isKelsierTheme,
	KELSIER_THEME_STORAGE_KEY,
	KELSIER_THEMES,
	type KelsierTheme,
} from "#/lib/kelsierThemes";

function applyTheme(theme: KelsierTheme) {
	document.documentElement.dataset.kelsierTheme = theme;
}

function readStoredTheme() {
	try {
		const storedTheme = window.localStorage.getItem(KELSIER_THEME_STORAGE_KEY);
		return isKelsierTheme(storedTheme) ? storedTheme : DEFAULT_KELSIER_THEME;
	} catch {
		return DEFAULT_KELSIER_THEME;
	}
}

function storeTheme(theme: KelsierTheme) {
	try {
		window.localStorage.setItem(KELSIER_THEME_STORAGE_KEY, theme);
	} catch {
		// Theme switching still works when storage is unavailable.
	}
}

export function KelsierThemePicker() {
	const [theme, setTheme] = useState<KelsierTheme>(DEFAULT_KELSIER_THEME);

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
