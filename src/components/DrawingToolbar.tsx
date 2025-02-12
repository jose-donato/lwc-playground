import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { useCallback } from "react";
import type React from "react";
import { DrawingToolType } from "../types/drawingTools";

interface DrawingToolbarProps {
	activeTool: DrawingToolType;
	onToolSelect: (tool: DrawingToolType) => void;
	chart?: IChartApi;
	series?: ISeriesApi<SeriesType>;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
	activeTool,
	onToolSelect,
	chart,
	series,
}) => {
	const handleToolSelect = useCallback(
		(tool: DrawingToolType) => {
			onToolSelect(tool);
		},
		[onToolSelect],
	);

	const tools = [
		{ type: DrawingToolType.NONE, label: "🖐️ Select" },
		{ type: DrawingToolType.DELTA, label: "📊 Measure" },
		{ type: DrawingToolType.RECTANGLE, label: "⬜ Rectangle" },
		/*{ type: DrawingToolType.LINE, label: "📏 Line" },
		{ type: DrawingToolType.HORIZONTAL_LINE, label: "➖ Horizontal" },
		{ type: DrawingToolType.VERTICAL_LINE, label: "⋮ Vertical" },
		{ type: DrawingToolType.TREND_LINE, label: "📈 Trend" },
		{ type: DrawingToolType.FIBONACCI, label: "🌀 Fibonacci" },
		*/
	];

	return (
		<div className="flex gap-2 p-2 bg-[#1a1a1c] rounded-lg mb-3">
			{tools.map((tool) => (
				<button
					key={tool.type}
					onClick={() => handleToolSelect(tool.type)}
					className={`
            w-full
						px-3 py-2 
						rounded 
						${activeTool === tool.type ? "bg-[#1e1e1e]" : "bg-[#3e3f40]"}
						text-white
						cursor-pointer
						text-sm
						transition-all duration-200 ease-in-out
					`}
					type="button"
				>
					{tool.label}
				</button>
			))}
		</div>
	);
};
