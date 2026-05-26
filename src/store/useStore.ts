import { create } from "zustand";
import { ProvenanceReport } from "@/utils/c2pa-transformer";

interface AppState {
  activeAnalysis: ProvenanceReport | null;
  isAnalyzing: boolean;
  error: string | null;
  activeView: "landing" | "dashboard" | "compare";
  theme: "dark" | "light";
  comparisonLeft: ProvenanceReport | null;
  comparisonRight: ProvenanceReport | null;
  isComparing: boolean;
  comparisonError: string | null;
  
  setAnalysis: (analysis: ProvenanceReport | null) => void;
  setAnalyzing: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setView: (view: "landing" | "dashboard" | "compare") => void;
  toggleTheme: () => void;
  setComparisonLeft: (report: ProvenanceReport | null) => void;
  setComparisonRight: (report: ProvenanceReport | null) => void;
  setComparing: (loading: boolean) => void;
  setComparisonError: (error: string | null) => void;
  resetAll: () => void;
}

export const useStore = create<AppState>((set) => ({
  activeAnalysis: null,
  isAnalyzing: false,
  error: null,
  activeView: "landing",
  theme: "dark",
  comparisonLeft: null,
  comparisonRight: null,
  isComparing: false,
  comparisonError: null,

  setAnalysis: (analysis) => set({ activeAnalysis: analysis }),
  setAnalyzing: (loading) => set({ isAnalyzing: loading }),
  setError: (error) => set({ error }),
  setView: (view) => set({ activeView: view }),
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      if (newTheme === "light") {
        root.classList.add("light-theme");
      } else {
        root.classList.remove("light-theme");
      }
    }
    return { theme: newTheme };
  }),
  
  setComparisonLeft: (report) => set({ comparisonLeft: report }),
  setComparisonRight: (report) => set({ comparisonRight: report }),
  setComparing: (loading) => set({ isComparing: loading }),
  setComparisonError: (error) => set({ comparisonError: error }),
  
  resetAll: () => set({
    activeAnalysis: null,
    isAnalyzing: false,
    error: null,
    activeView: "landing",
    comparisonLeft: null,
    comparisonRight: null,
    isComparing: false,
    comparisonError: null,
  }),
}));
export default useStore;
