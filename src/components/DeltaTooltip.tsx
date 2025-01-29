import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { DeltaTooltipPrimitive } from "../plugins/DeltaTooltip";
import { DrawingToolType } from "../types/drawingTools";

interface DeltaTooltipProps {
	chart: IChartApi;
	series: ISeriesApi<Time>;
	activeTool: DrawingToolType;
}

export const DeltaTooltip = ({
	chart,
	series,
	activeTool,
}: DeltaTooltipProps) => {
	const tooltipRef = useRef<DeltaTooltipPrimitive | null>(null);

	useEffect(() => {
		if (!chart || !series) return;

		if (activeTool === DrawingToolType.DELTA) {
			const tooltipPrimitive = new DeltaTooltipPrimitive({
				lineColor: "rgba(0, 0, 0, 0.2)",
				showTime: true,
				topOffset: 20,
			});

			series.attachPrimitive(tooltipPrimitive);
			tooltipRef.current = tooltipPrimitive;
		} else {
			if (tooltipRef.current) {
				series.detachPrimitive(tooltipRef.current);
				tooltipRef.current = null;
			}
		}

		return () => {
			if (tooltipRef.current) {
				series.detachPrimitive(tooltipRef.current);
				tooltipRef.current = null;
			}
		};
	}, [chart, series, activeTool]);

	return null;
};
