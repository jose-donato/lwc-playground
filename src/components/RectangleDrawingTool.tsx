import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { RectangleDrawingTool as RectangleDrawingToolPlugin } from "../plugins/rectangle-drawing-tool";

interface RectangleDrawingToolProps {
	chart: IChartApi;
	series: ISeriesApi<SeriesType>;
	active: boolean;
}

export const RectangleDrawingTool: React.FC<RectangleDrawingToolProps> = ({
	chart,
	series,
	active,
}) => {
	const toolRef = useRef<RectangleDrawingToolPlugin | null>(null);

	useEffect(() => {
		if (!toolRef.current) {
			// Initialize the rectangle drawing tool
			const tool = new RectangleDrawingToolPlugin(chart, series, {
				fillColor: "rgba(76, 175, 80, 0.5)",
				previewFillColor: "rgba(76, 175, 80, 0.2)",
				labelColor: "rgba(76, 175, 80, 1)",
				showLabels: true,
			});

			toolRef.current = tool;
		}

		return () => {
			if (toolRef.current) {
				toolRef.current.remove();
				toolRef.current = null;
			}
		};
	}, [chart, series]);

	useEffect(() => {
		if (toolRef.current) {
			console.log("Rectangle tool active:", active); // Debug log
			if (active) {
				toolRef.current.startDrawing();
			} else {
				toolRef.current.stopDrawing();
			}
		}
	}, [active]);

	return null;
};
