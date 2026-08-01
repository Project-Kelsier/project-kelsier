export const KELSIER_THEME_STORAGE_KEY = "kelsier-color-theme";
export const DEFAULT_KELSIER_THEME = "volt";

export const KELSIER_THEMES = [
	{ id: "ember", label: "Ember gold" },
	{ id: "phthalo", label: "Phthalo green" },
	{ id: "coral", label: "Signal coral" },
	{ id: "volt", label: "Volt lime" },
] as const;

export type KelsierTheme = (typeof KELSIER_THEMES)[number]["id"];

export function isKelsierTheme(value: string | null): value is KelsierTheme {
	return KELSIER_THEMES.some((theme) => theme.id === value);
}

const themeIds = KELSIER_THEMES.map((theme) => theme.id);

export const KELSIER_THEME_BOOTSTRAP_SCRIPT = `(()=>{try{const theme=localStorage.getItem(${JSON.stringify(KELSIER_THEME_STORAGE_KEY)});if(${JSON.stringify(themeIds)}.includes(theme)){document.documentElement.dataset.kelsierTheme=theme}}catch{}})();`;
