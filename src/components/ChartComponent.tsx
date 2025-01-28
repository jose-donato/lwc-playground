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
import { VolumeProfile } from "./VolumeProfile";

interface VolumeProfileItem {
	price: number;
	vol: number;
}

interface VolumeProfileData {
	profile: VolumeProfileItem[];
	width: number;
}

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

const generateMockCandlestickData = (): (CandlestickData & {
	volume: number;
})[] => {
	const data: (CandlestickData & { volume: number })[] = [];
	const startPrice = 100;
	let currentPrice = startPrice;

	// Create a start date (e.g., 100 days ago)
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 100);

	for (let i = 0; i < 100; i++) {
		const currentDate = new Date(startDate);
		currentDate.setDate(startDate.getDate() + i);

		const open = currentPrice;
		const close = open + (Math.random() - 0.5) * 10;
		const high = Math.max(open, close) + Math.random() * 5;
		const low = Math.min(open, close) - Math.random() * 5;
		const volume = Math.floor(Math.random() * 1000) + 100;

		data.push({
			// Convert date to timestamp in seconds for lightweight-charts
			time: Math.floor(currentDate.getTime() / 1000) as Time,
			open,
			high,
			low,
			close,
			volume,
		});
		currentPrice = close;
	}
	return data;
};

const generateMockVolumeProfileData = (
	candlestickData: (CandlestickData & { volume: number })[],
): VolumeProfileItem[] => {
	// Create price buckets for volume profile
	const allPrices = candlestickData.flatMap((candle) => [
		candle.high,
		candle.low,
	]);
	const minPrice = Math.min(...allPrices);
	const maxPrice = Math.max(...allPrices);
	const priceRange = maxPrice - minPrice;
	const numberOfBuckets = 15;
	const bucketSize = priceRange / numberOfBuckets;

	// Initialize buckets
	const volumeBuckets = new Array(numberOfBuckets).fill(0);

	// Distribute volume across price levels
	for (const candle of candlestickData) {
		const candleRange = candle.high - candle.low;
		const volumePerPrice = candle.volume / candleRange;

		for (let price = candle.low; price <= candle.high; price += 0.1) {
			const bucketIndex = Math.floor((price - minPrice) / bucketSize);
			if (bucketIndex >= 0 && bucketIndex < numberOfBuckets) {
				volumeBuckets[bucketIndex] += volumePerPrice * 0.1;
			}
		}
	}

	// Create profile items
	return volumeBuckets.map((vol, i) => ({
		price: minPrice + (i + 0.5) * bucketSize,
		vol: Math.round(vol / 1000), // Scale down the volume for display
	}));
};

const generateStreamingPoint = (
	lastCandle: CandlestickData & { volume: number },
) => {
	const time = (lastCandle.time as number) + 24 * 60 * 60; // Add one day
	const open = lastCandle.close;
	const close = open + (Math.random() - 0.5) * 10;
	const high = Math.max(open, close) + Math.random() * 5;
	const low = Math.min(open, close) - Math.random() * 5;
	const volume = Math.floor(Math.random() * 1000) + 100;

	return {
		time: time as Time,
		open,
		high,
		low,
		close,
		volume,
	};
};

export const ChartComponent: React.FC = () => {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
	const streamingIntervalRef = useRef<NodeJS.Timeout>();
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

		// Set volume data
		const volumeData = candlestickData.map((d) => ({
			time: d.time,
			value: d.volume,
			color:
				d.close > d.open
					? defaultColors.candleUpColor
					: defaultColors.candleDownColor,
		}));
		volumeSeries.setData(volumeData);

		// Generate and add volume profile using candlestick data
		const profileData = generateMockVolumeProfileData(candlestickData);
		const volumeProfileData: VolumeProfileData = {
			profile: profileData,
			width: 60,
		};

		// Add volume profile
		const volumeProfile = new VolumeProfile(
			chartRef.current,
			candlestickSeries,
			volumeProfileData,
		);
		candlestickSeries.attachPrimitive(volumeProfile);

		// Store the initial data
		candleDataRef.current = candlestickData;

		// Set up streaming updates
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
