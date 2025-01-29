import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type {
	AutoscaleInfo,
	Coordinate,
	IChartApi,
	ISeriesApi,
	ISeriesPrimitive,
	ISeriesPrimitivePaneRenderer,
	ISeriesPrimitivePaneView,
	SeriesAttachedParameter,
	SeriesOptionsMap,
	SeriesType,
	Time,
} from "lightweight-charts";
import { positionsBox } from "../../utils/chart";
import { PluginBase } from "../PluginBase";

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
		const data = this._source.vpData;
		const series = this._source.series;
		this._x = this._source.chart.timeScale().width() as Coordinate;
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

export class VolumeProfile extends PluginBase {
	private _vpData: VolumeProfileData;
	private _minPrice: number;
	private _maxPrice: number;
	private _paneViews: VolumeProfilePaneView[];

	constructor(vpData: VolumeProfileData) {
		super();
		this._vpData = vpData;
		this._minPrice = Number.POSITIVE_INFINITY;
		this._maxPrice = Number.NEGATIVE_INFINITY;
		this._paneViews = [];

		this.updatePriceBounds();
	}

	// Override the attached method from PluginBase
	public attached(param: SeriesAttachedParameter<Time>): void {
		// Call parent's attached method first
		super.attached(param);

		// Now that we have series and chart, initialize views
		this.updateAllViews();
	}

	private updatePriceBounds(): void {
		this._minPrice = Number.POSITIVE_INFINITY;
		this._maxPrice = Number.NEGATIVE_INFINITY;

		this._vpData.profile.forEach((vpData) => {
			if (vpData.price < this._minPrice) this._minPrice = vpData.price;
			if (vpData.price > this._maxPrice) this._maxPrice = vpData.price;
		});
	}

	public update(newVpData: VolumeProfileData): void {
		this._vpData = newVpData;
		this.updatePriceBounds();
		this.updateAllViews();
	}

	public updateAllViews(): void {
		if (!this.shouldRender()) {
			this._paneViews = [];
			return;
		}

		this._paneViews = [new VolumeProfilePaneView(this)];
		this._paneViews.forEach((pw) => pw.update());
	}

	public autoscaleInfo(): AutoscaleInfo {
		return {
			priceRange: {
				minValue: this._minPrice,
				maxValue: this._maxPrice,
			},
		};
	}

	public paneViews() {
		// Return empty array when not visible
		if (!this.isVisible()) {
			return [];
		}
		return this._paneViews;
	}

	// Getter for vpData that VolumeProfilePaneView needs
	public get vpData(): VolumeProfileData {
		return this._vpData;
	}
}
