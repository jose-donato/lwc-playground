import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { nanoid } from "nanoid";
import { useEffect, useRef } from "react";
import { RectangleDrawingTool as RectangleDrawingToolPlugin } from "../plugins/rectangle-drawing-tool";
import { useDrawingsStore } from "../stores/drawingsStore";
import type { Rectangle } from "../types/drawings";

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
	const { addDrawing, removeDrawing } = useDrawingsStore();

	// Subscribe to store changes to handle removals
	useEffect(() => {
		const unsubscribe = useDrawingsStore.subscribe((state, prevState) => {
			const removedDrawing = prevState.drawings.find(
				(d) => !state.drawings.some((curr) => curr.id === d.id),
			);
			if (
				removedDrawing &&
				removedDrawing.type === "rectangle" &&
				toolRef.current
			) {
				toolRef.current.removeDrawingByPoints(removedDrawing.points);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!toolRef.current) {
			const tool = new RectangleDrawingToolPlugin(chart, series, {
				fillColor: "rgba(76, 175, 80, 0.5)",
				previewFillColor: "rgba(76, 175, 80, 0.2)",
				labelColor: "rgba(76, 175, 80, 1)",
				showLabels: true,
				onRectangleComplete: (points) => {
					const drawing: Rectangle = {
						id: nanoid(),
						type: "rectangle",
						points: points.map((p) => ({
							time:
								typeof p.time === "number"
									? p.time
									: new Date(p.time).getTime(),
							price: p.price,
						})),
						fillColor: "rgba(76, 175, 80, 0.5)",
						fillOpacity: 0.5,
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
