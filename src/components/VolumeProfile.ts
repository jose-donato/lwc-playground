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

interface VolumeProfileItem {
	y: Coordinate | null;
	width: number;
}

interface VolumeProfileRendererData {
	x: Coordinate | null;
	top: Coordinate | null;
	columnHeight: number;
	width: number;
	items: VolumeProfileItem[];
}

interface VolumeProfileDataPoint {
	price: number;
	vol: number;
}

export interface VolumeProfileData {
	profile: VolumeProfileDataPoint[];
	width: number;
}

class VolumeProfileRenderer implements ISeriesPrimitivePaneRenderer {
	_data: VolumeProfileRendererData;
	constructor(data: VolumeProfileRendererData) {
		this._data = data;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace((scope) => {
			if (this._data.x === null || this._data.top === null) return;
			const ctx = scope.context;

			// Draw each volume bar
			this._data.items.forEach((row) => {
				if (row.y === null) return;

				const itemVerticalPos = positionsBox(
					row.y,
					row.y - this._data.columnHeight,
					scope.verticalPixelRatio,
				);

				const itemHorizontalPos = positionsBox(
					this._data.x! - row.width,
					this._data.x!,
					scope.horizontalPixelRatio,
				);

				// Draw volume bar
				ctx.fillStyle = "rgba(65, 163, 91, 0.2)";
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

class VolumeProfilePaneView implements ISeriesPrimitivePaneView {
	_source: VolumeProfile;
	_x: Coordinate | null = null;
	_width = 60;
	_columnHeight = 0;
	_top: Coordinate | null = null;
	_items: VolumeProfileItem[] = [];
	constructor(source: VolumeProfile) {
		this._source = source;
	}

	update() {
		const data = this._source._vpData;
		const series = this._source._series;
		this._x = this._source._chart.timeScale().width() as Coordinate;
		this._width = data.width;

		// Calculate the height of a single price level
		const firstPrice = series.priceToCoordinate(data.profile[0].price);
		const secondPrice = series.priceToCoordinate(data.profile[1].price);

		if (firstPrice !== null && secondPrice !== null) {
			this._columnHeight = Math.abs(firstPrice - secondPrice);
		}

		// Find max volume for scaling
		const maxVolume = Math.max(...data.profile.map((item) => item.vol));

		// Calculate coordinates for each price level
		this._items = data.profile.map((row) => {
			const y = series.priceToCoordinate(row.price);
			return {
				y: y,
				width: Math.max(1, (this._width * row.vol) / maxVolume), // Ensure minimum width of 1
			};
		});

		// Set top to the highest price level
		const highestPrice = Math.max(...data.profile.map((item) => item.price));
		this._top = series.priceToCoordinate(highestPrice);
	}

	renderer() {
		return new VolumeProfileRenderer({
			x: this._x,
			top: this._top,
			columnHeight: this._columnHeight,
			width: this._width,
			items: this._items,
		});
	}
}

export class VolumeProfile implements ISeriesPrimitive<Time> {
	_chart: IChartApi;
	_series: ISeriesApi<keyof SeriesOptionsMap>;
	_vpData: VolumeProfileData;
	_minPrice: number;
	_maxPrice: number;
	_paneViews: VolumeProfilePaneView[];
	private _visible = true;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		vpData: VolumeProfileData,
	) {
		this._chart = chart;
		this._series = series;
		this._vpData = vpData;
		this._minPrice = Number.POSITIVE_INFINITY;
		this._maxPrice = Number.NEGATIVE_INFINITY;
		this._vpData.profile.forEach((vpData) => {
			if (vpData.price < this._minPrice) this._minPrice = vpData.price;
			if (vpData.price > this._maxPrice) this._maxPrice = vpData.price;
		});
		this._paneViews = [new VolumeProfilePaneView(this)];
	}

	setVisible(visible: boolean): void {
		this._visible = visible;
		this.updateAllViews();
	}

	update(newVpData: VolumeProfileData) {
		this._vpData = newVpData;

		// Reset min/max prices
		this._minPrice = Number.POSITIVE_INFINITY;
		this._maxPrice = Number.NEGATIVE_INFINITY;

		// Recalculate min/max prices
		this._vpData.profile.forEach((vpData) => {
			if (vpData.price < this._minPrice) this._minPrice = vpData.price;
			if (vpData.price > this._maxPrice) this._maxPrice = vpData.price;
		});

		// Update all views to reflect new data
		this.updateAllViews();
	}

	updateAllViews() {
		if (!this._visible) {
			this._paneViews = [];
			return;
		}
		this._paneViews = [new VolumeProfilePaneView(this)];
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
