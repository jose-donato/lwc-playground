import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type {
	AutoscaleInfo,
	Coordinate,
	IChartApi,
	ISeriesApi,
	ISeriesPrimitive,
	ISeriesPrimitivePaneRenderer,
	ISeriesPrimitivePaneView,
	SeriesOptionsMap,
	SeriesType,
	Time,
} from "lightweight-charts";
import { positionsBox } from "../utils/chart";

interface OrderbookOrder {
	price: number;
	volume: number;
	startTime: Time;
	endTime: Time;
	isBid: boolean;
}

interface LiquidityHeatmapItem {
	y: Coordinate | null;
	startX: Coordinate | null;
	endX: Coordinate | null;
	intensity: number;
	isBid: boolean;
}

interface LiquidityHeatmapRendererData {
	items: LiquidityHeatmapItem[];
	lineHeight: number;
}

export interface LiquidityHeatmapData {
	orders: OrderbookOrder[];
}

class LiquidityHeatmapRenderer implements ISeriesPrimitivePaneRenderer {
	_data: LiquidityHeatmapRendererData;

	constructor(data: LiquidityHeatmapRendererData) {
		this._data = data;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace((scope) => {
			const ctx = scope.context;

			this._data.items.forEach((item) => {
				if (item.y === null || item.startX === null || item.endX === null)
					return;

				const itemVerticalPos = positionsBox(
					item.y - this._data.lineHeight / 2,
					item.y + this._data.lineHeight / 2,
					scope.verticalPixelRatio,
				);

				const itemHorizontalPos = positionsBox(
					item.startX,
					item.endX,
					scope.horizontalPixelRatio,
				);

				// Draw order line
				ctx.fillStyle = item.isBid
					? `rgba(65, 163, 91, ${Math.min(0.5, item.intensity)})`
					: `rgba(235, 64, 52, ${Math.min(0.5, item.intensity)})`;

				ctx.fillRect(
					itemHorizontalPos.position,
					itemVerticalPos.position,
					itemHorizontalPos.length,
					itemVerticalPos.length,
				);
			});
		});
	}
}

class LiquidityHeatmapPaneView implements ISeriesPrimitivePaneView {
	_source: LiquidityHeatmap;
	_items: LiquidityHeatmapItem[] = [];
	_lineHeight = 2; // Height of each order line

	constructor(source: LiquidityHeatmap) {
		this._source = source;
	}

	update() {
		const data = this._source._heatmapData;
		const series = this._source._series;
		const timeScale = this._source._chart.timeScale();

		// Find max volume for scaling
		const maxVolume = Math.max(...data.orders.map((order) => order.volume));

		// Calculate coordinates for each order
		this._items = data.orders.map((order) => {
			const y = series.priceToCoordinate(order.price);
			const startX = timeScale.timeToCoordinate(order.startTime);
			const endX = timeScale.timeToCoordinate(order.endTime);

			return {
				y,
				startX,
				endX,
				intensity: order.volume / maxVolume,
				isBid: order.isBid,
			};
		});
	}

	renderer() {
		return new LiquidityHeatmapRenderer({
			items: this._items,
			lineHeight: this._lineHeight,
		});
	}
}

export class LiquidityHeatmap implements ISeriesPrimitive<Time> {
	_chart: IChartApi;
	_series: ISeriesApi<keyof SeriesOptionsMap>;
	_heatmapData: LiquidityHeatmapData;
	_minPrice: number;
	_maxPrice: number;
	_paneViews: LiquidityHeatmapPaneView[];

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		heatmapData: LiquidityHeatmapData,
	) {
		this._chart = chart;
		this._series = series;
		this._heatmapData = heatmapData;
		this._minPrice = Number.POSITIVE_INFINITY;
		this._maxPrice = Number.NEGATIVE_INFINITY;
		this._heatmapData.orders.forEach((order) => {
			if (order.price < this._minPrice) this._minPrice = order.price;
			if (order.price > this._maxPrice) this._maxPrice = order.price;
		});
		this._paneViews = [new LiquidityHeatmapPaneView(this)];
	}

	update(newHeatmapData: LiquidityHeatmapData) {
		this._heatmapData = newHeatmapData;
		this._minPrice = Number.POSITIVE_INFINITY;
		this._maxPrice = Number.NEGATIVE_INFINITY;
		this._heatmapData.orders.forEach((order) => {
			if (order.price < this._minPrice) this._minPrice = order.price;
			if (order.price > this._maxPrice) this._maxPrice = order.price;
		});
		this.updateAllViews();
	}

	updateAllViews() {
		this._paneViews.forEach((pw) => pw.update());
	}

	autoscaleInfo(): AutoscaleInfo {
		return {
			priceRange: {
				minValue: this._minPrice,
				maxValue: this._maxPrice,
			},
		};
	}

	paneViews() {
		return this._paneViews;
	}
}
