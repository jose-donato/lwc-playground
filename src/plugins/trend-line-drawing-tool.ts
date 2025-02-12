import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type {
	IChartApi,
	ISeriesApi,
	ISeriesPrimitive,
	ISeriesPrimitivePaneRenderer,
	ISeriesPrimitivePaneView,
	MouseEventParams,
	SeriesType,
	Time,
} from "lightweight-charts";

interface TrendLineDrawingToolOptions {
	lineColor?: string;
	lineWidth?: number;
	showLabels?: boolean;
}

interface Point {
	time: Time;
	price: number;
}

class TrendLinePaneView implements ISeriesPrimitivePaneView {
	private _points: Point[];
	private _color: string;
	private _lineWidth: number;
	private _series: ISeriesApi<SeriesType>;
	private _chart: IChartApi;

	constructor(
		points: Point[],
		color: string,
		lineWidth: number,
		series: ISeriesApi<SeriesType>,
		chart: IChartApi,
	) {
		this._points = points;
		this._color = color;
		this._lineWidth = lineWidth;
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

						const x1 = this._chart.timeScale().timeToCoordinate(point1.time);
						const x2 = this._chart.timeScale().timeToCoordinate(point2.time);
						const y1 = this._series.priceToCoordinate(point1.price);
						const y2 = this._series.priceToCoordinate(point2.price);

						if (x1 === null || x2 === null || y1 === null || y2 === null)
							return;

						ctx.beginPath();
						ctx.strokeStyle = this._color;
						ctx.lineWidth = this._lineWidth * horizontalPixelRatio;

						const startX = Math.round(x1 * horizontalPixelRatio);
						const startY = Math.round(y1 * verticalPixelRatio);
						const endX = Math.round(x2 * horizontalPixelRatio);
						const endY = Math.round(y2 * verticalPixelRatio);

						ctx.moveTo(startX, startY);
						ctx.lineTo(endX, endY);
						ctx.stroke();
					},
				);
			},
		};
	}
}

class TrendLinePrimitive implements ISeriesPrimitive<Time> {
	private _paneView: TrendLinePaneView;
	private _series: ISeriesApi<SeriesType>;
	private _chart: IChartApi;

	constructor(
		points: Point[],
		color: string,
		lineWidth: number,
		series: ISeriesApi<SeriesType>,
		chart: IChartApi,
	) {
		this._series = series;
		this._chart = chart;
		this._paneView = new TrendLinePaneView(
			points,
			color,
			lineWidth,
			series,
			chart,
		);
	}

	updatePoints(points: Point[], color: string, lineWidth: number) {
		this._paneView = new TrendLinePaneView(
			points,
			color,
			lineWidth,
			this._series,
			this._chart,
		);
	}

	paneViews() {
		return [this._paneView];
	}

	attached(): void {}
	detached(): void {}
}

export class TrendLineDrawingTool {
	private chart: IChartApi;
	private series: ISeriesApi<SeriesType>;
	private isDrawing = false;
	private startPoint: Point | null = null;
	private currentLine: TrendLinePrimitive | null = null;
	private lines: TrendLinePrimitive[] = [];
	private options: Required<TrendLineDrawingToolOptions>;
	private clickHandler: any;
	private moveHandler: any;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: TrendLineDrawingToolOptions = {},
	) {
		this.chart = chart;
		this.series = series;
		this.options = {
			lineColor: options.lineColor || "#2196F3",
			lineWidth: options.lineWidth || 2,
			showLabels: options.showLabels ?? true,
		};

		this.clickHandler = this.handleClick.bind(this);
		this.moveHandler = this.handleMouseMove.bind(this);
	}

	public startDrawing(): void {
		this.chart.subscribeClick(this.clickHandler);
		this.chart.subscribeCrosshairMove(this.moveHandler);
	}

	public stopDrawing(): void {
		this.isDrawing = false;
		this.startPoint = null;
		if (this.currentLine) {
			this.series.detachPrimitive(this.currentLine);
			this.currentLine = null;
		}
		this.chart.unsubscribeClick(this.clickHandler);
		this.chart.unsubscribeCrosshairMove(this.moveHandler);
	}

	private handleClick(param: MouseEventParams): void {
		if (!param.point || !param.time) return;

		const price = this.series.coordinateToPrice(param.point.y);
		if (price === null) return;

		if (!this.isDrawing) {
			this.isDrawing = true;
			this.startPoint = { time: param.time, price };
		} else {
			this.createFinalLine(param.time, price);
			this.isDrawing = false;
			this.startPoint = null;
		}
	}

	private handleMouseMove(param: MouseEventParams): void {
		if (!this.isDrawing || !this.startPoint || !param.point || !param.time)
			return;

		const price = this.series.coordinateToPrice(param.point.y);
		if (price === null) return;

		if (!this.currentLine) {
			this.currentLine = new TrendLinePrimitive(
				[
					{ time: this.startPoint.time, price: this.startPoint.price },
					{ time: param.time, price },
				],
				this.options.lineColor,
				this.options.lineWidth,
				this.series,
				this.chart,
			);
			this.series.attachPrimitive(this.currentLine);
		} else {
			this.currentLine.updatePoints(
				[
					{ time: this.startPoint.time, price: this.startPoint.price },
					{ time: param.time, price },
				],
				this.options.lineColor,
				this.options.lineWidth,
			);
		}
	}

	private createFinalLine(endTime: Time, endPrice: number): void {
		if (!this.startPoint) return;

		if (this.currentLine) {
			this.currentLine.updatePoints(
				[
					{ time: this.startPoint.time, price: this.startPoint.price },
					{ time: endTime, price: endPrice },
				],
				this.options.lineColor,
				this.options.lineWidth,
			);

			this.lines.push(this.currentLine);
			this.currentLine = null;
		}
	}

	public remove(): void {
		this.stopDrawing();
		this.lines.forEach((line) => {
			this.series.detachPrimitive(line);
		});
		this.lines = [];
		if (this.currentLine) {
			this.series.detachPrimitive(this.currentLine);
			this.currentLine = null;
		}
	}
}
