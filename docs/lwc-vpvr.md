please remove all my current plugins and create a new plugin infra like we have below. I want to have a plugin base and then VPVR that i can use in my @ChartComponent.tsx when i toggle in the screen

================================================
File: README.md
================================================
# Visible Price Range Util - Lightweight Charts™ Plugin

A plugin for providing a utility API to retrieve the visible range of a price scale, and subscribe to changes.

- Developed for Lightweight Charts version: `v4.1.0`

## Installation

```bash
npm install lwc-plugin-visible-price-range-util
```

## Usage

```js
import { VisiblePriceRangeUtil } from 'lwc-plugin-visible-price-range-util';

// Create an instantiated Visible Price Range Util primitive.
const vprUtil = new VisiblePriceRangeUtil();

// Create the chart and series...
const chart = createChart(document.getElementById('container'));
const lineSeries = chart.addLineSeries();
const data = [
    { time: 1642425322, value: 123 },
    /* ... more data */
];

// Attach the utility to the series
lineSeries.attachPrimitive(vprUtil);

const currentVisiblePriceRange = vprUtil.getVisiblePriceRange();
vprUtil.priceRangeChanged().subscribe(function(newRange) {
    if (!newRange) return;
    console.log(`Price Range is now from ${newRange.bottom} to ${newRange.top}`);
});
```

## Developing

### Running Locally

```shell
npm install
npm run dev
```

Visit `localhost:5173` in the browser.

### Compiling

```shell
npm run compile
```

Check the output in the `dist` folder.


================================================
File: compile.mjs
================================================
import { dirname, resolve } from 'node:path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { build, defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { generateDtsBundle } from 'dts-bundle-generator';

function buildPackageJson(packageName) {
	/*
	 Define the contents of the package's package.json here.
	 */
	return {
		name: packageName,
		"author": "Mark Silverwood",
		"repository": {
			"type": "git",
			"url": "https://github.com/slicedsilver/lwc-plugin-visible-price-range-util.git"
		},
		version: '0.1.1',
		keywords: ['lwc-plugin', 'lightweight-charts'],
		type: 'module',
		main: `./${packageName}.umd.cjs`,
		module: `./${packageName}.js`,
		types: `./${packageName}.d.ts`,
		exports: {
			import: {
				types: `./${packageName}.d.ts`,
				default: `./${packageName}.js`,
			},
			require: {
				types: `./${packageName}.d.cts`,
				default: `./${packageName}.umd.cjs`,
			},
		},
	};
}

const __filename = fileURLToPath(import.meta.url);
const currentDir = dirname(__filename);

const pluginFileName = 'visible-price-range-util';
const pluginFile = resolve(currentDir, 'src', `${pluginFileName}.ts`);

const pluginsToBuild = [
	{
		filepath: pluginFile,
		exportName: 'lwc-plugin-visible-price-range-util',
		name: 'VisiblePriceRangeUtil',
	},
];

const compiledFolder = resolve(currentDir, 'dist');
if (!existsSync(compiledFolder)) {
	mkdirSync(compiledFolder);
}

const buildConfig = ({
	filepath,
	name,
	exportName,
	formats = ['es', 'umd'],
}) => {
	return defineConfig({
		publicDir: false,
		build: {
			outDir: `dist`,
			emptyOutDir: true,
			copyPublicDir: false,
			lib: {
				entry: filepath,
				name,
				formats,
				fileName: exportName,
			},
			rollupOptions: {
				external: ['lightweight-charts', 'fancy-canvas'],
				output: {
					globals: {
						'lightweight-charts': 'LightweightCharts',
					},
				},
			},
		},
	});
};

const startTime = Date.now().valueOf();
console.log('⚡️ Starting');
console.log('Bundling the plugin...');
const promises = pluginsToBuild.map(file => {
	return build(buildConfig(file));
});
await Promise.all(promises);
console.log('Generating the package.json file...');
pluginsToBuild.forEach(file => {
	const packagePath = resolve(compiledFolder, 'package.json');
	const content = JSON.stringify(
		buildPackageJson(file.exportName),
		undefined,
		4
	);
	writeFileSync(packagePath, content, { encoding: 'utf-8' });
});
console.log('Generating the typings files...');
pluginsToBuild.forEach(file => {
	try {
		const esModuleTyping = generateDtsBundle([
			{
				filePath: `./typings/${pluginFileName}.d.ts`,
			},
		]);
		const typingFilePath = resolve(compiledFolder, `${file.exportName}.d.ts`);
		writeFileSync(typingFilePath, esModuleTyping.join('\n'), {
			encoding: 'utf-8',
		});
		copyFileSync(typingFilePath, resolve(compiledFolder, `${file.exportName}.d.cts`));
	} catch (e) {
		console.error('Error generating typings for: ', file.exportName);
	}
});
copyFileSync(resolve(currentDir, 'README.md'), resolve(compiledFolder, `README.md`));
const endTime = Date.now().valueOf();
console.log(`🎉 Done (${endTime - startTime}ms)`);


================================================
File: index.html
================================================
<!DOCTYPE html>
<html>
	<head>
        <!-- redirect to example page -->
		<meta http-equiv="refresh" content="0; URL=src/example/" />
	</head>
</html>


================================================
File: package.json
================================================
{
  "name": "lwc-plugin-visible-price-range-util",
  "type": "module",
  "scripts": {
    "dev": "vite --config src/vite.config.js",
    "compile": "tsc && node compile.mjs"
  },
  "devDependencies": {
    "typescript": "^5.0.4",
    "vite": "^4.3.1"
  },
  "dependencies": {
    "dts-bundle-generator": "^8.0.1",
    "fancy-canvas": "^2.1.0",
    "lightweight-charts": "^4.1.0-rc2"
  }
}


================================================
File: tsconfig.json
================================================
{
	"compilerOptions": {
		"target": "ESNext",
		"useDefineForClassFields": true,
		"module": "ESNext",
		"lib": ["ESNext", "DOM"],
		"moduleResolution": "Node",
		"strict": true,
		"resolveJsonModule": true,
		"isolatedModules": true,
		"esModuleInterop": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"noImplicitReturns": true,
		"skipLibCheck": true,
		"declaration": true,
		"declarationDir": "typings",
		"emitDeclarationOnly": true
	},
	"include": ["src"]
}


================================================
File: src/options.ts
================================================
export interface VisiblePriceRangeUtilOptions {}

export const defaultOptions: VisiblePriceRangeUtilOptions = {} as const;


================================================
File: src/plugin-base.ts
================================================
import {
	DataChangedScope,
	IChartApi,
	ISeriesApi,
	ISeriesPrimitive,
	SeriesAttachedParameter,
	SeriesOptionsMap,
	Time,
} from 'lightweight-charts';
import { ensureDefined } from './helpers/assertions';

export abstract class PluginBase implements ISeriesPrimitive<Time> {
	private _chart: IChartApi | undefined = undefined;
	private _series: ISeriesApi<keyof SeriesOptionsMap> | undefined = undefined;

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
		return ensureDefined(this._chart);
	}

	public get series(): ISeriesApi<keyof SeriesOptionsMap> {
		return ensureDefined(this._series);
	}
}


================================================
File: src/visible-price-range-util.ts
================================================
import { VisiblePriceRangeUtilOptions, defaultOptions } from './options';
import { PluginBase } from './plugin-base';
import { Delegate, ISubscription } from './helpers/delegate';

export interface VisiblePriceRange {
	bottom: number;
	top: number;
}

export type VisiblePriceRangeResult = Readonly<VisiblePriceRange> | null;

export class VisiblePriceRangeUtil extends PluginBase {
	_options: VisiblePriceRangeUtilOptions;
	_currentRange: VisiblePriceRange | null = null;
	private _changed: Delegate<VisiblePriceRangeResult> = new Delegate();

	constructor(options: Partial<VisiblePriceRangeUtilOptions> = {}) {
		super();
		this._options = {
			...defaultOptions,
			...options,
		};
	}

	updateAllViews() {
		// a chart rendering is occurring, might result in a different price range
		this._checkPriceRange();
	}

	public get options(): VisiblePriceRangeUtilOptions {
		return this._options;
	}

	applyOptions(options: Partial<VisiblePriceRangeUtilOptions>) {
		this._options = { ...this._options, ...options };
	}

	public priceRangeChanged(): ISubscription<VisiblePriceRangeResult> {
		return this._changed;
	}

	public getVisiblePriceRange(): VisiblePriceRangeResult {
		return this._currentRange;
	}

	private _checkPriceRange() {
		const newRange = this._measurePriceRange();
		const oneNull = newRange === null || this._currentRange === null;
		const bothNull = oneNull && newRange === this._currentRange;
		const changed =
			(oneNull && !bothNull) ||
			newRange!.bottom !== this._currentRange!.bottom ||
			newRange!.top !== this._currentRange!.top;
		if (changed) {
			this._changed.fire(newRange);
		}
		this._currentRange = newRange;
	}

	private _measurePriceRange(): VisiblePriceRange | null {
		if (!this.chart || !this.series) return null;
		const paneSize = this.chart.paneSize();
		const top = this.series.coordinateToPrice(0);
		const bottom = this.series.coordinateToPrice(paneSize.height);
		if (top === null || bottom === null) return null;
		return {
			top,
			bottom,
		};
	}
}


================================================
File: src/vite-env.d.ts
================================================
/// <reference types="vite/client" />


================================================
File: src/vite.config.js
================================================
import { defineConfig } from 'vite';

const input = {
	main: './src/example/index.html',
};

export default defineConfig({
	build: {
		rollupOptions: {
			input,
		},
	},
});


================================================
File: src/example/example.ts
================================================
import { createChart } from 'lightweight-charts';
import { generateLineData } from './sample-data';
import { VisiblePriceRangeUtil } from '../visible-price-range-util';

const chart = ((window as unknown as any).chart = createChart('chart', {
	autoSize: true,
}));

const lineSeries = chart.addLineSeries({
	color: '#000000',
});
const data = generateLineData();
lineSeries.setData(data);

const vprUtil = new VisiblePriceRangeUtil();
(window as unknown as any).vpru = vprUtil;

lineSeries.attachPrimitive(vprUtil);

const outputEl = document.querySelector<HTMLDivElement>('#output');

vprUtil.priceRangeChanged().subscribe(function (newRange) {
	if (!newRange) {
		if (outputEl) outputEl.innerText = `No price range`;
		return;
	}
	const text = `Price Range is now from ${newRange.bottom.toFixed(2)} to ${newRange.top.toFixed(2)}`;
	console.log(text);
	if (outputEl) outputEl.innerText = text;
});


================================================
File: src/example/index.html
================================================
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Template Drawing Primitive Plugin Example</title>
		<style>
			body {
				background-color: rgba(248, 249, 253, 1);
				color: rgba(19, 23, 34, 1);
			}
			#chart {
				margin-inline: auto;
				max-width: 600px;
				height: 300px;
				background-color: rgba(240, 243, 250, 1);
				border-radius: 5px;
				overflow: hidden;
			}
			.container {
				display: flex;
				justify-content: center;
			}
			#output {
				margin: 10px;
			}
		</style>
	</head>
	<body>
		<div id="chart"></div>
		<div class="container">
			<div id="output"></div>
		</div>

		<script type="module" src="./example.ts"></script>
	</body>
</html>


================================================
File: src/example/sample-data.ts
================================================
import type { Time } from 'lightweight-charts';

type LineData = {
	time: Time;
	value: number;
};

let randomFactor = 25 + Math.random() * 25;
const samplePoint = (i: number) =>
	i *
		(0.5 +
			Math.sin(i / 10) * 0.2 +
			Math.sin(i / 20) * 0.4 +
			Math.sin(i / randomFactor) * 0.8 +
			Math.sin(i / 500) * 0.5) +
	200;

export function generateLineData(numberOfPoints: number = 500): LineData[] {
	randomFactor = 25 + Math.random() * 25;
	const res = [];
	const date = new Date(Date.UTC(2023, 0, 1, 12, 0, 0, 0));
	for (let i = 0; i < numberOfPoints; ++i) {
		const time = (date.getTime() / 1000) as Time;
		const value = samplePoint(i);
		res.push({
			time,
			value,
		});

		date.setUTCDate(date.getUTCDate() + 1);
	}

	return res;
}


================================================
File: src/helpers/assertions.ts
================================================
/**
 * Ensures that value is defined.
 * Throws if the value is undefined, returns the original value otherwise.
 *
 * @param value - The value, or undefined.
 * @returns The passed value, if it is not undefined
 */
export function ensureDefined(value: undefined): never;
export function ensureDefined<T>(value: T | undefined): T;
export function ensureDefined<T>(value: T | undefined): T {
	if (value === undefined) {
		throw new Error('Value is undefined');
	}

	return value;
}

/**
 * Ensures that value is not null.
 * Throws if the value is null, returns the original value otherwise.
 *
 * @param value - The value, or null.
 * @returns The passed value, if it is not null
 */
export function ensureNotNull(value: null): never;
export function ensureNotNull<T>(value: T | null): T;
export function ensureNotNull<T>(value: T | null): T {
	if (value === null) {
		throw new Error('Value is null');
	}

	return value;
}


================================================
File: src/helpers/delegate.ts
================================================
export type Callback<T1 = void> = (param1: T1) => void;

export interface ISubscription<T1 = void> {
	subscribe(
		callback: Callback<T1>,
		linkedObject?: unknown,
		singleshot?: boolean
	): void;
	unsubscribe(callback: Callback<T1>): void;
	unsubscribeAll(linkedObject: unknown): void;
}

interface Listener<T1> {
	callback: Callback<T1>;
	linkedObject?: unknown;
	singleshot: boolean;
}

export class Delegate<T1 = void> implements ISubscription<T1> {
	private _listeners: Listener<T1>[] = [];

	public subscribe(
		callback: Callback<T1>,
		linkedObject?: unknown,
		singleshot?: boolean
	): void {
		const listener: Listener<T1> = {
			callback,
			linkedObject,
			singleshot: singleshot === true,
		};
		this._listeners.push(listener);
	}

	public unsubscribe(callback: Callback<T1>): void {
		const index = this._listeners.findIndex(
			(listener: Listener<T1>) => callback === listener.callback
		);
		if (index > -1) {
			this._listeners.splice(index, 1);
		}
	}

	public unsubscribeAll(linkedObject: unknown): void {
		this._listeners = this._listeners.filter(
			(listener: Listener<T1>) => listener.linkedObject !== linkedObject
		);
	}

	public fire(param1: T1): void {
		const listenersSnapshot = [...this._listeners];
		this._listeners = this._listeners.filter(
			(listener: Listener<T1>) => !listener.singleshot
		);
		listenersSnapshot.forEach((listener: Listener<T1>) =>
			listener.callback(param1)
		);
	}

	public hasListeners(): boolean {
		return this._listeners.length > 0;
	}

	public destroy(): void {
		this._listeners = [];
	}
}


