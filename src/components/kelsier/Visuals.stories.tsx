import type { Meta, StoryObj } from "@storybook/react-vite";
import { InsightBarsVisual, RadarVisual, TeamMapVisual } from "./Visuals";

const meta = {
	title: "Kelsier/Visuals",
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<div className="kelsier-page w-[min(90vw,760px)] p-8">
				<Story />
			</div>
		),
	],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CurrentSet: Story = {
	render: () => (
		<div className="grid gap-6 md:grid-cols-3">
			<div className="k-feat-visual">
				<RadarVisual />
			</div>
			<div className="k-feat-visual">
				<TeamMapVisual />
			</div>
			<div className="k-feat-visual">
				<InsightBarsVisual />
			</div>
		</div>
	),
};

export const PersonalityRadar: Story = {
	render: () => (
		<div className="k-feat-visual min-w-60">
			<RadarVisual />
		</div>
	),
};

export const TeamMap: Story = {
	render: () => (
		<div className="k-feat-visual min-w-60">
			<TeamMapVisual />
		</div>
	),
};

export const InsightBars: Story = {
	render: () => (
		<div className="k-feat-visual min-w-80">
			<InsightBarsVisual />
		</div>
	),
};
