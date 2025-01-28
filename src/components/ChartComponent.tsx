import {
	type CandlestickData,
	type ChartOptions,
	ColorType,
	type DeepPartial,
	type IChartApi,
	type ISeriesApi,
	type Time,
	createChart,
} from "lightweight-charts";
import type React from "react";
import { useEffect, useRef } from "react";
import {
	type VolumeProfileData,
	generateMockCandlestickData,
	generateMockHeatmapData,
	generateMockVolumeProfileData,
	generateStreamingPoint,
} from "../utils/mockChartData";
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
		});

		volumeSeries.priceScale().applyOptions({
			scaleMargins: {
				top: 0.9,
				bottom: 0,
			},
		});

		// Set mock candlestick data
		const candlestickData = generateMockCandlestickData();
		candlestickSeries.setData(candlestickData);

		// Generate and set up volume profile
		const profileData = generateMockVolumeProfileData(candlestickData);
		const volumeProfileData: VolumeProfileData = {
			profile: profileData,
			width: 60,
		};

		// Create and attach the volume profile
		const volumeProfile = new VolumeProfile(
			chartRef.current,
			candlestickSeries,
			volumeProfileData,
		);

		// Force an initial update
		volumeProfile.updateAllViews();
		candlestickSeries.attachPrimitive(volumeProfile);

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

	return (
		<div ref={chartContainerRef} style={{ width: "100%", height: "400px" }} />
	);
};
