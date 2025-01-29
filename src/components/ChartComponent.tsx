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
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { VerticalLine } from "../plugins/VerticalLine";
import { DrawingToolType } from "../types/drawingTools";
import {
	type VolumeProfileData,
	generateMockCandlestickData,
	generateMockHeatmapData,
	generateMockVolumeProfileData,
	generateStreamingPoint,
} from "../utils/mockChartData";
import { DrawingToolbar } from "./DrawingToolbar";
import { DrawingTools } from "./DrawingTools";
import { LiquidityHeatmap } from "./LiquidityHeatmap";
import { VolumeProfile } from "./VolumeProfile";

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

		// Generate heatmap data based on candlestick data
		const orders = generateMockHeatmapData(candlestickData);

		// Add debugging logs
		console.log("Generated heatmap orders:", orders);

		const heatmapOrders = orders.flatMap((order) => [
			// Create bid order
			{
				price: order.bid,
				volume: order.bidVolume,
				startTime: order.time,
				endTime: order.endTime,
				isBid: true,
			},
			// Create ask order
			{
				price: order.ask,
				volume: order.askVolume,
				startTime: order.time,
				endTime: order.endTime,
				isBid: false,
			},
		]);

		console.log("Transformed heatmap orders:", heatmapOrders);

		// Create and attach the heatmap
		const liquidityHeatmap = new LiquidityHeatmap(
			chartRef.current,
			candlestickSeries,
			{ orders: heatmapOrders },
		);

		// Force an initial update
		liquidityHeatmap.updateAllViews();
		candlestickSeries.attachPrimitive(liquidityHeatmap);

		// Add volumeProfile to candlestick series after creating the heatmap
		const profileData = generateMockVolumeProfileData(candlestickData);
		const volumeProfileData: VolumeProfileData = {
			profile: profileData,
			width: 60,
		};

		const volumeProfile = new VolumeProfile(
			chartRef.current,
			candlestickSeries,
			volumeProfileData,
		);
		volumeProfileRef.current = volumeProfile;

		if (!showVPVR) {
			volumeProfile.setVisible(false);
		}

		// Force an initial update
		volumeProfile.updateAllViews();
		candlestickSeries.attachPrimitive(volumeProfile);

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

	// Handle mouse interactions based on active tool
	useEffect(() => {
		const chart = chartRef.current;
		const series = candlestickSeriesRef.current;

		if (!chart || !series) return;

		const handleClick = (param: MouseEventParams) => {
			if (!param.point) return;

			if (activeTool === DrawingToolType.VERTICAL_LINE) {
				if (param.time) {
					const vertLine = new VerticalLine(chart, series, param.time, {
						color: "#4444ff",
						width: 2,
						showLabel: true,
						labelText: "V-Line",
					});
					series.attachPrimitive(vertLine);
					setActiveTool(DrawingToolType.NONE); // Reset tool after drawing
				}
			}
		};

		chart.subscribeClick(handleClick);

		return () => {
			chart.unsubscribeClick(handleClick);
		};
	}, [activeTool]);

	// Add effect to handle visibility changes
	useEffect(() => {
		if (volumeSeriesRef.current) {
			volumeSeriesRef.current.applyOptions({ visible: showVolume });
		}
	}, [showVolume]);

	useEffect(() => {
		if (volumeProfileRef.current) {
			volumeProfileRef.current.setVisible(showVPVR);
		}
	}, [showVPVR]);

	return (
		<div>
			<div className="flex gap-4 mb-4">
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
			/>
		</div>
	);
};
