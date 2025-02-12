import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { nanoid } from "nanoid";
import { useEffect, useRef } from "react";
import { TrendLineDrawingTool as TrendLineDrawingToolPlugin } from "../plugins/trend-line-drawing-tool";
import { useDrawingsStore } from "../stores/drawingsStore";
import type { TrendLine } from "../types/drawings";

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
	const { addDrawing, removeDrawing } = useDrawingsStore();

	// Subscribe to store changes to handle removals
	useEffect(() => {
		const unsubscribe = useDrawingsStore.subscribe((state, prevState) => {
			const removedDrawing = prevState.drawings.find(
				(d) => !state.drawings.some((curr) => curr.id === d.id),
			);
			if (
				removedDrawing &&
				removedDrawing.type === "trendline" &&
				toolRef.current
			) {
				toolRef.current.removeDrawingByPoints(removedDrawing.points);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!toolRef.current) {
			const tool = new TrendLineDrawingToolPlugin(chart, series, {
				lineColor: "#2196F3",
				lineWidth: 2,
				showLabels: true,
				onLineComplete: (points) => {
					const drawing: TrendLine = {
						id: nanoid(),
						type: "trendline",
						points: points.map((p) => ({
							time:
								typeof p.time === "number"
									? p.time
									: new Date(p.time).getTime(),
							price: p.price,
						})),
						color: "#2196F3",
						lineWidth: 2,
					};
					addDrawing(drawing);
				},
			});

			toolRef.current = tool;
		}

		return () => {
			if (toolRef.current) {
				toolRef.current.remove();
				toolRef.current = null;
			}
		};
	}, [chart, series, addDrawing]);

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
