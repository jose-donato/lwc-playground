export interface Point {
	time: number;
	price: number;
}

export interface BaseDraw {
	id: string;
	points: Point[];
}

export interface TrendLine extends BaseDraw {
	type: "trendline";
	color: string;
	lineWidth: number;
}

export interface Rectangle extends BaseDraw {
	type: "rectangle";
	fillColor: string;
	fillOpacity: number;
}

export type Drawing = TrendLine | Rectangle;
