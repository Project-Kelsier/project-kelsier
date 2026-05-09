import { useCallback, useEffect, useRef, useState } from "react";

type LegacyMediaQueryList = {
	addListener(callback: EventListener): void;
	removeListener(callback: EventListener): void;
};

export function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function ease(value: number) {
	return value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;
}

export function usePrefersReducedMotion() {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) {
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => {
			setPrefersReducedMotion(mediaQuery.matches);
		};

		sync();
		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", sync);
		} else {
			const legacyMediaQuery = mediaQuery as unknown as LegacyMediaQueryList;
			legacyMediaQuery.addListener(sync);
		}

		return () => {
			if (typeof mediaQuery.removeEventListener === "function") {
				mediaQuery.removeEventListener("change", sync);
			} else {
				const legacyMediaQuery = mediaQuery as unknown as LegacyMediaQueryList;
				legacyMediaQuery.removeListener(sync);
			}
		};
	}, []);

	return prefersReducedMotion;
}

type ScrollCallback = (scrollY: number) => void;

export function useKelsierScrollAnimation(callback: ScrollCallback) {
	const frameRef = useRef<number>(0);
	const isTickingRef = useRef(false);

	const onScroll = useCallback(() => {
		if (isTickingRef.current) {
			return;
		}

		isTickingRef.current = true;
		frameRef.current = window.requestAnimationFrame(() => {
			callback(window.scrollY);
			isTickingRef.current = false;
		});
	}, [callback]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		callback(window.scrollY);

		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);

		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			window.cancelAnimationFrame(frameRef.current);
		};
	}, [callback, onScroll]);
}
