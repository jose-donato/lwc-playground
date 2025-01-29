import type {
	DataChangedScope,
	IChartApi,
	ISeriesApi,
	ISeriesPrimitive,
	SeriesAttachedParameter,
	SeriesOptionsMap,
	Time,
} from "lightweight-charts";

export abstract class PluginBase implements ISeriesPrimitive<Time> {
	private _chart: IChartApi | undefined = undefined;
	private _series: ISeriesApi<keyof SeriesOptionsMap> | undefined = undefined;
	private _visible = true;

	protected dataUpdated?(scope: DataChangedScope): void;

	public attached({ chart, series }: SeriesAttachedParameter<Time>) {
		this._chart = chart;
		this._series = series;
	}

	public detached() {
		this._chart = undefined;
		this._series = undefined;
	}

	public get chart(): IChartApi {
		if (!this._chart) throw new Error("Chart is not defined");
		return this._chart;
	}

	public get series(): ISeriesApi<keyof SeriesOptionsMap> {
		if (!this._series) throw new Error("Series is not defined");
		return this._series;
	}

	public setVisible(visible: boolean): void {
		if (this._visible !== visible) {
			this._visible = visible;
			this.updateAllViews();
		}
	}

	public isVisible(): boolean {
		return this._visible;
	}

	protected shouldRender(): boolean {
		return (
			this._visible && this._chart !== undefined && this._series !== undefined
		);
	}

	public abstract updateAllViews(): void;
}
