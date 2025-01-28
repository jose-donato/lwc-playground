import type { CanvasRenderingTarget2D } from "fancy-canvas";
import {
	type Coordinate,
	type IChartApi,
	type ISeriesApi,
	type ISeriesPrimitive,
	ISeriesPrimitiveAxisView,
	type ISeriesPrimitivePaneRenderer,
	type ISeriesPrimitivePaneView,
	type SeriesOptionsMap,
	type SeriesType,
	type Time,
} from "lightweight-charts";

interface VerticalLineOptions {
	color: string;
	width: number;
	showLabel: boolean;
	labelText: string;
	labelBackgroundColor: string;
	labelTextColor: string;
}

const defaultOptions: VerticalLineOptions = {
	color: "#3e3f40",
	width: 2,
	showLabel: false,
	labelText: "",
	labelBackgroundColor: "#3e3f40",
	labelTextColor: "white",
};

class VerticalLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
	_x: Coordinate | null = null;
	_options: VerticalLineOptions;

	constructor(x: Coordinate | null, options: VerticalLineOptions) {
		this._x = x;
		this._options = options;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace((scope) => {
			if (this._x === null) return;
			const ctx = scope.context;
			ctx.fillStyle = this._options.color;
			ctx.fillRect(
				this._x * scope.horizontalPixelRatio,
				0,
				this._options.width * scope.horizontalPixelRatio,
				scope.bitmapSize.height,
			);
		});
	}
}

class VerticalLinePaneView implements ISeriesPrimitivePaneView {
	_source: VerticalLine;
	_x: Coordinate | null = null;
	_options: VerticalLineOptions;

	constructor(source: VerticalLine, options: VerticalLineOptions) {
		this._source = source;
		this._options = options;
	}

	update() {
		const timeScale = this._source._chart.timeScale();
		this._x = timeScale.timeToCoordinate(this._source._time);
	}

	renderer() {
		return new VerticalLinePaneRenderer(this._x, this._options);
	}
}

export class VerticalLine implements ISeriesPrimitive<Time> {
	_chart: IChartApi;
	_series: ISeriesApi<keyof SeriesOptionsMap>;
	_time: Time;
	_paneViews: VerticalLinePaneView[];

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		time: Time,
		options?: Partial<VerticalLineOptions>,
	) {
		const lineOptions = { ...defaultOptions, ...options };
		this._chart = chart;
		this._series = series;
		this._time = time;
		this._paneViews = [new VerticalLinePaneView(this, lineOptions)];
	}

	updateAllViews() {
		this._paneViews.forEach((pw) => pw.update());
	}

	paneViews() {
		return this._paneViews;
	}

	timeAxisViews() {
		return [];
	}
}
