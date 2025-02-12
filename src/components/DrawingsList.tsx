import { useDrawingsStore } from "../stores/drawingsStore";

export const DrawingsList: React.FC = () => {
	const { drawings, removeDrawing, clearDrawings } = useDrawingsStore();

	return (
		<div className="mt-4">
			<div className="flex justify-between items-center mb-2">
				<h3 className="text-lg font-semibold">Drawings</h3>
				<button
					onClick={clearDrawings}
					className="px-2 py-1 bg-red-500 text-white rounded"
					type="button"
				>
					Clear All
				</button>
			</div>
			<div className="space-y-2">
				{drawings.map((drawing) => (
					<div
						key={drawing.id}
						className="flex justify-between items-center p-2 bg-gray-800 rounded"
					>
						<span>
							{drawing.type === "trendline" ? "📈 Trend Line" : "⬜ Rectangle"}
						</span>
						<button
							onClick={() => removeDrawing(drawing.id)}
							className="text-red-500"
							type="button"
						>
							✕
						</button>
					</div>
				))}
			</div>
		</div>
	);
};
