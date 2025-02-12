import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Drawing } from "../types/drawings";

interface DrawingsState {
	drawings: Drawing[];
	addDrawing: (drawing: Drawing) => void;
	removeDrawing: (id: string) => void;
	clearDrawings: () => void;
}

export const useDrawingsStore = create<DrawingsState>()(
	persist(
		(set) => ({
			drawings: [],
			addDrawing: (drawing) =>
				set((state) => ({
					drawings: [...state.drawings, drawing],
				})),
			removeDrawing: (id) =>
				set((state) => ({
					drawings: state.drawings.filter((d) => d.id !== id),
				})),
			clearDrawings: () => set({ drawings: [] }),
		}),
		{
			name: "drawings-storage",
		},
	),
);
