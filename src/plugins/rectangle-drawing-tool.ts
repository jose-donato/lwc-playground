import type { CanvasRenderingTarget2D } from "fancy-canvas";
import {
	type IChartApi,
	IPricedValue,
	type ISeriesApi,
	type ISeriesPrimitive,
	type ISeriesPrimitivePaneRenderer,
	type ISeriesPrimitivePaneView,
	type MouseEventParams,
	type SeriesType,
	type Time,
} from "lightweight-charts";

interface RectangleDrawingToolOptions {
	fillColor?: string;
	previewFillColor?: string;
	labelColor?: string;
	showLabels?: boolean;
	onRectangleComplete?: (points: Point[]) => void;
}

interface Point {
	time: Time;
	price: number;
}

// Add this interface for hit testing
interface HitTestResult {
	rectangle: RectanglePrimitive;
	index: number;
}

class RectanglePaneView implements ISeriesPrimitivePaneView {
	private _points: Point[];
	private _color: string;
	private _fillOpacity: number;
	private _series: ISeriesApi<SeriesType>;
	private _chart: IChartApi;

	constructor(
		points: Point[],
		color: string,
		fillOpacity: number,
		series: ISeriesApi<SeriesType>,
		chart: IChartApi,
	) {
		this._points = points;
		this._color = color;
		this._fillOpacity = fillOpacity;
		this._series = series;
		this._chart = chart;
	}

	// Add method to check if a point is inside the rectangle
	public hitTest(x: number, y: number): boolean {
		if (this._points.length < 2) return false;

		const [point1, point2] = this._points;

		// Convert points to coordinates
		const x1 = this._chart.timeScale().timeToCoordinate(point1.time);
		const x2 = this._chart.timeScale().timeToCoordinate(point2.time);
		const y1 = this._series.priceToCoordinate(point1.price);
		const y2 = this._series.priceToCoordinate(point2.price);

		if (x1 === null || x2 === null || y1 === null || y2 === null) return false;

		// Check if point is inside rectangle
		const left = Math.min(x1, x2);
		const right = Math.max(x1, x2);
		const top = Math.min(y1, y2);
		const bottom = Math.max(y1, y2);

		return x >= left && x <= right && y >= top && y <= bottom;
	}

	renderer(): ISeriesPrimitivePaneRenderer {
		return {
			draw: (target: CanvasRenderingTarget2D) => {
				if (this._points.length < 2) return;

				target.useBitmapCoordinateSpace(
					({ context: ctx, horizontalPixelRatio, verticalPixelRatio }) => {
						const [point1, point2] = this._points;

						// Convert time to x coordinate using chart's timeScale
						const x1 = this._chart.timeScale().timeToCoordinate(point1.time);
						const x2 = this._chart.timeScale().timeToCoordinate(point2.time);

						// Convert price to y coordinate
						const y1 = this._series.priceToCoordinate(point1.price);
						const y2 = this._series.priceToCoordinate(point2.price);

						if (x1 === null || x2 === null || y1 === null || y2 === null)
							return;

						// Draw fill
						ctx.fillStyle = this._color;
						ctx.globalAlpha = this._fillOpacity;

						const left = Math.round(Math.min(x1, x2) * horizontalPixelRatio);
						const right = Math.round(Math.max(x1, x2) * horizontalPixelRatio);
						const top = Math.round(Math.min(y1, y2) * verticalPixelRatio);
						const bottom = Math.round(Math.max(y1, y2) * verticalPixelRatio);

						ctx.fillRect(left, top, right - left, bottom - top);

						// Draw border
						ctx.globalAlpha = 1;
						ctx.strokeStyle = this._color;
						ctx.lineWidth = 1 * horizontalPixelRatio;
						ctx.strokeRect(left, top, right - left, bottom - top);

						// Request next frame to ensure smooth updates
						this._chart.timeScale().scrollToPosition(0, false);
					},
				);
			},
		};
	}
}

class RectanglePrimitive implements ISeriesPrimitive<Time> {
	private _paneView: RectanglePaneView;
	private _series: ISeriesApi<SeriesType>;
	private _chart: IChartApi;

	constructor(
		points: Point[],
		color: string,
		fillOpacity: number,
		series: ISeriesApi<SeriesType>,
		chart: IChartApi,
	) {
		this._series = series;
		this._chart = chart;
		this._paneView = new RectanglePaneView(
			points,
			color,
			fillOpacity,
			series,
			chart,
		);
	}

	public updatePoints(points: Point[], color: string, fillOpacity: number) {
		this._paneView = new RectanglePaneView(
			points,
			color,
			fillOpacity,
			this._series,
			this._chart,
		);
	}

	public paneViews() {
		return [this._paneView];
	}

	attached(): void {}
	detached(): void {}
}

export class RectangleDrawingTool {
	private chart: IChartApi;
	private series: ISeriesApi<SeriesType>;
	private isDrawing = false;
	private startPoint: Point | null = null;
	private currentRectangle: RectanglePrimitive | null = null;
	private rectangles: RectanglePrimitive[] = [];
	private options: Required<RectangleDrawingToolOptions>;
	private clickHandler: any;
	private moveHandler: any;
	private drawingsMap: Map<string, RectanglePrimitive> = new Map();

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: RectangleDrawingToolOptions = {},
	) {
		this.chart = chart;
		this.series = series;
		this.options = {
			fillColor: options.fillColor || "rgba(76, 175, 80, 0.5)",
			previewFillColor: options.previewFillColor || "rgba(76, 175, 80, 0.2)",
			labelColor: options.labelColor || "rgba(76, 175, 80, 1)",
			showLabels: options.showLabels ?? true,
			onRectangleComplete: options.onRectangleComplete || (() => {}),
		};

		this.clickHandler = this.handleClick.bind(this);
		this.moveHandler = this.handleMouseMove.bind(this);

		// Add click handler for removing rectangles
		this.chart.subscribeClick((param) => {
			if (!this.isDrawing && param.point) {
				const hitTest = this.hitTest(param.point.x, param.point.y);
				if (hitTest) {
					if (confirm("Do you want to remove this rectangle?")) {
						this.removeRectangle(hitTest.index);
					}
				}
			}
		});
	}

	public startDrawing(): void {
		console.log("Starting rectangle drawing mode");
		this.chart.subscribeClick(this.clickHandler);
		this.chart.subscribeCrosshairMove(this.moveHandler);
	}

	public stopDrawing(): void {
		console.log("Stopping rectangle drawing mode");
		this.isDrawing = false;
		this.startPoint = null;
		if (this.currentRectangle) {
			this.series.detachPrimitive(this.currentRectangle);
			this.currentRectangle = null;
		}
		this.chart.unsubscribeClick(this.clickHandler);
		this.chart.unsubscribeCrosshairMove(this.moveHandler);
	}

	private handleClick(param: MouseEventParams): void {
		if (!param.point || !param.time) return;

		// If we hit an existing rectangle, don't start drawing
		if (this.hitTest(param.point.x, param.point.y)) {
			return;
		}

		const price = this.series.coordinateToPrice(param.point.y);
		if (price === null) return;

		if (!this.isDrawing) {
			// Start drawing
			console.log("Starting new rectangle at:", param.time, price);
			this.isDrawing = true;
			this.startPoint = { time: param.time, price };
		} else {
			// Finish drawing
			console.log("Completing rectangle at:", param.time, price);
			this.createFinalRectangle(param.time, price);
			this.isDrawing = false;
			this.startPoint = null;
		}
	}

	private handleMouseMove(param: MouseEventParams): void {
		if (!this.isDrawing || !this.startPoint || !param.point || !param.time)
			return;

		const price = this.series.coordinateToPrice(param.point.y);
		if (price === null) return;

		if (!this.currentRectangle) {
			this.currentRectangle = new RectanglePrimitive(
				[
					{ time: this.startPoint.time, price: this.startPoint.price },
					{ time: param.time, price },
				],
				this.options.previewFillColor,
				0.2, // Reduced opacity for preview
				this.series,
				this.chart,
			);
			this.series.attachPrimitive(this.currentRectangle);
		} else {
			this.currentRectangle.updatePoints(
				[
					{ time: this.startPoint.time, price: this.startPoint.price },
					{ time: param.time, price },
				],
				this.options.previewFillColor,
				0.2, // Reduced opacity for preview
			);
		}

		// Force a redraw
		this.chart.timeScale().scrollToPosition(0, false);
	}

	public createFinalRectangle(endTime: Time, endPrice: number): void {
		if (!this.startPoint) return;

		if (this.currentRectangle) {
			const points = [
				{ time: this.startPoint.time, price: this.startPoint.price },
				{ time: endTime, price: endPrice },
			];

			this.currentRectangle.updatePoints(points, this.options.fillColor, 0.5);

			this.rectangles.push(this.currentRectangle);
			// Store in map
			this.drawingsMap.set(JSON.stringify(points), this.currentRectangle);
			this.currentRectangle = null;

			this.options.onRectangleComplete(points);
		}
	}

	public remove(): void {
		this.stopDrawing();
		// Clean up all rectangles
		this.rectangles.forEach((rectangle) => {
			this.series.detachPrimitive(rectangle);
		});
		this.rectangles = [];
		if (this.currentRectangle) {
			this.series.detachPrimitive(this.currentRectangle);
			this.currentRectangle = null;
		}
	}

	// Add method to test if a point hits any rectangle
	private hitTest(x: number, y: number): HitTestResult | null {
		for (let i = 0; i < this.rectangles.length; i++) {
			const rectangle = this.rectangles[i];
			const paneViews = rectangle.paneViews();
			if (paneViews.length > 0) {
				const view = paneViews[0] as RectanglePaneView;
				if (view.hitTest(x, y)) {
					return { rectangle, index: i };
				}
			}
		}
		return null;
	}

	// Add method to remove a specific rectangle
	private removeRectangle(index: number): void {
		if (index >= 0 && index < this.rectangles.length) {
			const rectangle = this.rectangles[index];
			this.series.detachPrimitive(rectangle);
			this.rectangles.splice(index, 1);
		}
	}

	public removeDrawingByPoints(points: Point[]): void {
		const key = JSON.stringify(points);
		const rectangle = this.drawingsMap.get(key);
		if (rectangle) {
			this.series.detachPrimitive(rectangle);
			this.drawingsMap.delete(key);
			this.rectangles = this.rectangles.filter((r) => r !== rectangle);
		}
	}
}
