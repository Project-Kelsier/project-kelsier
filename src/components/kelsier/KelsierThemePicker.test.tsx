import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KELSIER_THEMES } from "#/lib/kelsierThemes";
import { KelsierThemePicker } from "./KelsierThemePicker";

afterEach(() => {
	vi.restoreAllMocks();
	delete document.documentElement.dataset.kelsierTheme;
});
it("switches every theme even when browser storage is blocked", () => {
	vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
		throw new DOMException("blocked", "SecurityError");
	});
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new DOMException("blocked", "SecurityError");
	});
	render(<KelsierThemePicker />);
	expect(screen.getByRole("combobox")).toHaveProperty("value", "volt");
	for (const theme of KELSIER_THEMES) {
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: theme.id },
		});
		expect(document.documentElement.dataset.kelsierTheme).toBe(theme.id);
	}
});
