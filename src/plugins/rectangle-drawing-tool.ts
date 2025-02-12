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
}

interface Point {
	time: Time;
	price: number;
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
	private options: Required<RectangleDrawingToolOptions>;
	private clickHandler: any;
	private moveHandler: any;

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
		};

		this.clickHandler = this.handleClick.bind(this);
		this.moveHandler = this.handleMouseMove.bind(this);
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
		console.log("Click event:", param);
		if (!param.point || !param.time) return;

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

		this.updatePreviewRectangle(param.time, price);
	}

	private createFinalRectangle(endTime: Time, endPrice: number): void {
		if (!this.startPoint) return;

		// Remove preview rectangle if it exists
		if (this.currentRectangle) {
			this.series.detachPrimitive(this.currentRectangle);
		}

		// Create the final rectangle primitive
		this.currentRectangle = new RectanglePrimitive(
			[
				{ time: this.startPoint.time, price: this.startPoint.price },
				{ time: endTime, price: endPrice },
			],
			this.options.fillColor,
			0.5,
			this.series,
			this.chart,
		);

		console.log("Creating final rectangle:", this.currentRectangle);
		this.series.attachPrimitive(this.currentRectangle);
	}

	private updatePreviewRectangle(
		currentTime: Time,
		currentPrice: number,
	): void {
		if (!this.startPoint) return;

		// Remove previous preview rectangle if it exists
		if (this.currentRectangle) {
			this.series.detachPrimitive(this.currentRectangle);
		}

		// Create new preview rectangle
		this.currentRectangle = new RectanglePrimitive(
			[
				{ time: this.startPoint.time, price: this.startPoint.price },
				{ time: currentTime, price: currentPrice },
			],
			this.options.previewFillColor,
			0.3,
			this.series,
			this.chart,
		);

		this.series.attachPrimitive(this.currentRectangle);
	}

	public remove(): void {
		this.stopDrawing();
		if (this.currentRectangle) {
			this.series.detachPrimitive(this.currentRectangle);
		}
	}
}
