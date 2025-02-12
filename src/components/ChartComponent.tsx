import {
	type CandlestickData,
	type ChartOptions,
	ColorType,
	type DeepPartial,
	type IChartApi,
	type ISeriesApi,
	type MouseEventParams,
	type Time,
	createChart,
} from "lightweight-charts";
import type { LineData } from "lightweight-charts";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { HeatmapIndicator } from "../plugins/HeatmapIndicator/HeatmapIndicator";
import { VolumeProfile } from "../plugins/VolumeProfile/VolumeProfile";
import { DrawingToolType } from "../types/drawingTools";
import {
	type VolumeProfileData,
	generateMockCandlestickData,
	generateMockHeatmapData,
	generateMockVolumeProfileData,
	generateStreamingPoint,
} from "../utils/mockChartData";
import { DeltaTooltip } from "./DeltaTooltip";
import { DrawingToolbar } from "./DrawingToolbar";
import { DrawingTools } from "./DrawingTools";
import { RectangleDrawingTool } from "./RectangleDrawingTool";

interface ChartColors {
	backgroundColor: string;
	textColor: string;
	gridColor: string;
	candleUpColor: string;
	candleDownColor: string;
	wickUpColor: string;
	wickDownColor: string;
}

const defaultColors: ChartColors = {
	backgroundColor: "#111113",
	textColor: "#ffffff",
	gridColor: "#2e2f3055",
	candleUpColor: "#41a35bff",
	candleDownColor: "#0c5b3bff",
	wickUpColor: "#41a35088",
	wickDownColor: "#0c5b3b88",
};

// Add chart type enum above the ChartColors interface
enum ChartType {
	CANDLESTICK = "candlestick",
	LINE = "line",
}

export const ChartComponent: React.FC = () => {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
	const streamingIntervalRef = useRef<number | null>(null);
	const candleDataRef = useRef<(CandlestickData & { volume: number })[]>([]);
	const [activeTool, setActiveTool] = useState<DrawingToolType>(
		DrawingToolType.NONE,
	);
	const [showVolume, setShowVolume] = useState(true);
	const [showVPVR, setShowVPVR] = useState(true);
	const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
	const volumeProfileRef = useRef<VolumeProfile | null>(null);
	const [chartType, setChartType] = useState<ChartType>(ChartType.CANDLESTICK);
	const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

	useEffect(() => {
		if (!chartContainerRef.current) return;

		const handleResize = () => {
			if (chartRef.current && chartContainerRef.current) {
				chartRef.current.applyOptions({
					width: chartContainerRef.current.clientWidth,
				});
			}
		};

		const chartOptions: DeepPartial<ChartOptions> = {
			layout: {
				background: {
					type: ColorType.Solid,
					color: defaultColors.backgroundColor,
				},
				textColor: defaultColors.textColor,
			},
			width: chartContainerRef.current.clientWidth,
			height: 400,
			grid: {
				vertLines: {
					color: defaultColors.gridColor,
					visible: true,
				},
				horzLines: {
					color: defaultColors.gridColor,
					visible: true,
				},
			},
			crosshair: {
				// Enable crosshair for better drawing precision
				mode: 1,
				vertLine: {
					width: 1,
					color: "#ffffff33",
					style: 2,
					visible: true,
					labelVisible: false,
				},
				horzLine: {
					width: 1,
					color: "#ffffff33",
					style: 2,
					visible: true,
					labelVisible: true,
				},
			},
		};

		// Create chart
		chartRef.current = createChart(chartContainerRef.current, chartOptions);
		chartRef.current.timeScale().fitContent();

		// Add candlestick series
		const candlestickSeries = chartRef.current.addCandlestickSeries({
			upColor: defaultColors.candleUpColor,
			downColor: defaultColors.candleDownColor,
			wickUpColor: defaultColors.wickUpColor,
			wickDownColor: defaultColors.wickDownColor,
			borderVisible: false,
		});
		candlestickSeriesRef.current = candlestickSeries;

		// Add volume histogram series
		const volumeSeries = chartRef.current.addHistogramSeries({
			color: defaultColors.candleUpColor,
			priceFormat: {
				type: "volume",
			},
			priceScaleId: "volume",
			visible: showVolume,
		});
		volumeSeriesRef.current = volumeSeries;

		volumeSeries.priceScale().applyOptions({
			scaleMargins: {
				top: 0.8,
				bottom: 0,
			},
		});

		// Set mock candlestick data
		const candlestickData = generateMockCandlestickData();
		candlestickSeries.setData(candlestickData);

		// Set volume data
		const volumeData = candlestickData.map((candle) => ({
			time: candle.time,
			value: candle.volume || 0,
			color:
				(candle.close || 0) >= (candle.open || 0)
					? defaultColors.candleUpColor
					: defaultColors.candleDownColor,
		}));
		volumeSeries.setData(volumeData);

		// Create VolumeProfile with just the data
		const profileData = generateMockVolumeProfileData(candlestickData);
		const volumeProfileData: VolumeProfileData = {
			profile: profileData,
			width: 60,
		};

		const volumeProfile = new VolumeProfile(volumeProfileData);
		volumeProfileRef.current = volumeProfile;

		// Attach to series - this will trigger the attached method
		candlestickSeries.attachPrimitive(volumeProfile);

		if (!showVPVR) {
			volumeProfile.setVisible(false);
		}

		// Store the initial data
		candleDataRef.current = candlestickData;

		// Set up streaming updates
		/*
		streamingIntervalRef.current = setInterval(() => {
			if (!candlestickSeriesRef.current || candleDataRef.current.length === 0)
				return;

			// Generate new candle
			const newCandle = generateStreamingPoint(
				candleDataRef.current[candleDataRef.current.length - 1],
			);
			candleDataRef.current.push(newCandle);

			// Update candlestick series
			candlestickSeriesRef.current.update(newCandle);

			// Update volume series
			volumeSeries.update({
				time: newCandle.time,
				value: newCandle.volume,
				color:
					newCandle.close > newCandle.open
						? defaultColors.candleUpColor
						: defaultColors.candleDownColor,
			});

			// Update volume profile
			const profileData = generateMockVolumeProfileData(candleDataRef.current);
			const volumeProfileData: VolumeProfileData = {
				profile: profileData,
				width: 60,
			};
			volumeProfile.update(volumeProfileData);
		}, 1000); // Update every second
		*/
		window.addEventListener("resize", handleResize);

		// Add line series but hide it initially
		const lineSeries = chartRef.current.addLineSeries({
			color: defaultColors.candleUpColor,
			visible: false,
		});
		lineSeriesRef.current = lineSeries;

		// Set line data
		const lineData = candlestickData.map((candle) => ({
			time: candle.time,
			value: candle.close,
		}));
		lineSeries.setData(lineData);

		return () => {
			if (streamingIntervalRef.current) {
				clearInterval(streamingIntervalRef.current);
			}
			window.removeEventListener("resize", handleResize);
			if (chartRef.current) {
				chartRef.current.remove();
			}
		};
	}, []);

	useEffect(() => {
		if (volumeSeriesRef.current) {
			volumeSeriesRef.current.applyOptions({ visible: showVolume });
		}
	}, [showVolume]);

	useEffect(() => {
		if (volumeProfileRef.current) {
			volumeProfileRef.current.setVisible(showVPVR);
			// Force chart to update
			if (chartRef.current) {
				const mainScale = chartRef.current.priceScale("right");
				mainScale.applyOptions(mainScale.options());
			}
		}
	}, [showVPVR]);

	// Add new effect to handle chart type changes
	useEffect(() => {
		if (!candlestickSeriesRef.current || !lineSeriesRef.current) return;

		if (chartType === ChartType.CANDLESTICK) {
			candlestickSeriesRef.current.applyOptions({ visible: true });
			lineSeriesRef.current.applyOptions({ visible: false });
		} else {
			candlestickSeriesRef.current.applyOptions({ visible: false });
			lineSeriesRef.current.applyOptions({ visible: true });
		}
	}, [chartType]);

	return (
		<div>
			<div className="flex gap-4 mb-4 items-center justify-center">
				<select
					value={chartType}
					onChange={(e) => setChartType(e.target.value as ChartType)}
					className="px-2 py-1 rounded text-white"
				>
					<option value={ChartType.CANDLESTICK}>Candlestick</option>
					<option value={ChartType.LINE}>Line</option>
				</select>
				<DrawingToolbar
					activeTool={activeTool}
					onToolSelect={setActiveTool}
					chart={chartRef.current}
					series={candlestickSeriesRef.current}
				/>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={showVolume}
						onChange={(e) => setShowVolume(e.target.checked)}
					/>
					Show Volume
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={showVPVR}
						onChange={(e) => setShowVPVR(e.target.checked)}
					/>
					Show VPVR
				</label>
			</div>
			<div
				ref={chartContainerRef}
				style={{ width: "100%", height: "400px" }}
				className={`cursor-${activeTool === DrawingToolType.NONE ? "default" : "crosshair"}`}
			>
				{chartRef.current && candlestickSeriesRef.current && (
					<>
						<DeltaTooltip
							chart={chartRef.current}
							series={candlestickSeriesRef.current}
							activeTool={activeTool}
						/>
						<RectangleDrawingTool
							chart={chartRef.current}
							series={candlestickSeriesRef.current}
							active={activeTool === DrawingToolType.RECTANGLE}
						/>
					</>
				)}
			</div>
		</div>
	);
};
