export function RadarVisual() {
	return (
		<svg
			width="160"
			height="160"
			viewBox="0 0 160 160"
			className="k-visual-svg"
			aria-hidden="true"
		>
			<polygon
				points="80,10 138,45 138,115 80,150 22,115 22,45"
				fill="none"
				stroke="rgba(191,146,72,0.18)"
				strokeWidth="0.5"
			/>
			<polygon
				points="80,28 120,55 120,105 80,132 40,105 40,55"
				fill="none"
				stroke="rgba(191,146,72,0.13)"
				strokeWidth="0.5"
			/>
			<polygon
				points="80,46 102,65 102,95 80,114 58,95 58,65"
				fill="none"
				stroke="rgba(191,146,72,0.09)"
				strokeWidth="0.5"
			/>
			{[0, 1, 2, 3, 4, 5].map((index) => {
				const angle = (index * 60 - 90) * (Math.PI / 180);
				return (
					<line
						key={index}
						x1="80"
						y1="80"
						x2={80 + 70 * Math.cos(angle)}
						y2={80 + 70 * Math.sin(angle)}
						stroke="rgba(191,146,72,0.1)"
						strokeWidth="0.5"
					/>
				);
			})}
			<polygon
				points="80,16 132,58 118,112 54,128 28,76 62,32"
				fill="rgba(191,146,72,0.07)"
				stroke="#BF9248"
				strokeWidth="1"
			/>
			{[
				[80, 16],
				[132, 58],
				[118, 112],
				[54, 128],
				[28, 76],
				[62, 32],
			].map(([cx, cy]) => (
				<circle
					key={`${cx}-${cy}`}
					cx={cx}
					cy={cy}
					r="3"
					fill="#BF9248"
					opacity="0.85"
				/>
			))}
		</svg>
	);
}

export function TeamMapVisual() {
	return (
		<svg
			width="180"
			height="130"
			viewBox="0 0 180 130"
			className="k-visual-svg"
			aria-hidden="true"
		>
			<circle
				cx="36"
				cy="65"
				r="24"
				fill="none"
				stroke="#3A7A68"
				strokeWidth="0.8"
				opacity="0.65"
			/>
			<circle
				cx="88"
				cy="36"
				r="19"
				fill="none"
				stroke="#BF9248"
				strokeWidth="0.8"
				opacity="0.65"
			/>
			<circle
				cx="144"
				cy="65"
				r="22"
				fill="none"
				stroke="#8C5FA0"
				strokeWidth="0.8"
				opacity="0.65"
			/>
			<circle
				cx="88"
				cy="94"
				r="16"
				fill="none"
				stroke="#3B5FA0"
				strokeWidth="0.8"
				opacity="0.55"
			/>
			<line
				x1="36"
				y1="65"
				x2="88"
				y2="36"
				stroke="rgba(191,146,72,0.2)"
				strokeWidth="0.5"
			/>
			<line
				x1="88"
				y1="36"
				x2="144"
				y2="65"
				stroke="rgba(191,146,72,0.2)"
				strokeWidth="0.5"
			/>
			<line
				x1="36"
				y1="65"
				x2="88"
				y2="94"
				stroke="rgba(58,122,104,0.25)"
				strokeWidth="0.5"
			/>
			<line
				x1="144"
				y1="65"
				x2="88"
				y2="94"
				stroke="rgba(140,95,160,0.25)"
				strokeWidth="0.5"
			/>
			<line
				x1="36"
				y1="65"
				x2="144"
				y2="65"
				stroke="rgba(220,80,80,0.12)"
				strokeWidth="1.2"
				strokeDasharray="4 5"
			/>
		</svg>
	);
}

export function InsightBarsVisual() {
	const bars = [
		{ label: "Openness", pct: 84, color: "#3B5FA0" },
		{ label: "Conscientiousness", pct: 61, color: "#3A7A68" },
		{ label: "Agreeableness", pct: 78, color: "#8C5FA0" },
		{ label: "Extraversion", pct: 45, color: "#BF9248" },
		{ label: "Stability", pct: 91, color: "#C0544A" },
	];

	return (
		<div className="k-bars" aria-hidden="true">
			{bars.map(({ color, label, pct }) => (
				<div key={label}>
					<div className="k-bars__meta">
						<span className="k-bars__label">{label}</span>
						<span className="k-bars__value" style={{ color }}>
							{pct}
						</span>
					</div>
					<div className="k-bars__track">
						<div
							className="k-bars__fill"
							style={{ width: `${pct}%`, background: color }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
