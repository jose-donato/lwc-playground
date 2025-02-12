import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { TrendLineDrawingTool as TrendLineDrawingToolPlugin } from "../plugins/trend-line-drawing-tool";

interface TrendLineDrawingToolProps {
	chart: IChartApi;
	series: ISeriesApi<SeriesType>;
	active: boolean;
}

export const TrendLineDrawingTool: React.FC<TrendLineDrawingToolProps> = ({
	chart,
	series,
	active,
}) => {
	const toolRef = useRef<TrendLineDrawingToolPlugin | null>(null);

	useEffect(() => {
		if (!toolRef.current) {
			const tool = new TrendLineDrawingToolPlugin(chart, series, {
				lineColor: "#2196F3",
				lineWidth: 2,
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
			if (active) {
				toolRef.current.startDrawing();
			} else {
				toolRef.current.stopDrawing();
			}
		}
	}, [active]);

	return null;
};
