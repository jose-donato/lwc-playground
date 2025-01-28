import type { CandlestickData, Time } from "lightweight-charts";

interface VolumeProfileItem {
	price: number;
	vol: number;
}

export interface VolumeProfileData {
	profile: VolumeProfileItem[];
	width: number;
}

export const generateMockCandlestickData = (): (CandlestickData & {
	volume: number;
})[] => {
	const data: (CandlestickData & { volume: number })[] = [];
	const startPrice = 100;
	let currentPrice = startPrice;

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

export const generateMockVolumeProfileData = (
	candlestickData: (CandlestickData & { volume: number })[],
): VolumeProfileItem[] => {
	const allPrices = candlestickData.flatMap((candle) => [
		candle.high,
		candle.low,
	]);
	const minPrice = Math.min(...allPrices);
	const maxPrice = Math.max(...allPrices);
	const priceRange = maxPrice - minPrice;
	const numberOfBuckets = 15;
	const bucketSize = priceRange / numberOfBuckets;

	const volumeBuckets = new Array(numberOfBuckets).fill(0);

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

	return volumeBuckets.map((vol, i) => ({
		price: minPrice + (i + 0.5) * bucketSize,
		vol: Math.round(vol / 1000),
	}));
};

export const generateStreamingPoint = (
	lastCandle: CandlestickData & { volume: number },
) => {
	const time = (lastCandle.time as number) + 24 * 60 * 60;
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
