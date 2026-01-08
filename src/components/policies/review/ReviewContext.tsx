'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';

// State types
interface ReviewState {
  selectedActorId: string | null;
  searchQuery: string;
  showComparisonPanel: boolean;
  expandedSections: Record<string, string[]>; // actorId -> sectionNames[]
  activeTab: Record<string, 'sections' | 'documents'>; // actorId -> tab
}

// Action types
type ReviewAction =
  | { type: 'SELECT_ACTOR'; actorId: string | null }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'TOGGLE_COMPARISON' }
  | { type: 'SET_COMPARISON'; show: boolean }
  | { type: 'TOGGLE_SECTION'; actorId: string; section: string }
  | { type: 'SET_EXPANDED_SECTIONS'; actorId: string; sections: string[] }
  | { type: 'SET_TAB'; actorId: string; tab: 'sections' | 'documents' }
  | { type: 'RESET' };

// Initial state
const initialState: ReviewState = {
  selectedActorId: null,
  searchQuery: '',
  showComparisonPanel: false,
  expandedSections: {},
  activeTab: {},
};

// Reducer
function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'SELECT_ACTOR':
      return { ...state, selectedActorId: action.actorId };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };

    case 'TOGGLE_COMPARISON':
      return { ...state, showComparisonPanel: !state.showComparisonPanel };

    case 'SET_COMPARISON':
      return { ...state, showComparisonPanel: action.show };

    case 'TOGGLE_SECTION': {
      const actorSections = state.expandedSections[action.actorId] || [];
      const isExpanded = actorSections.includes(action.section);
      return {
        ...state,
        expandedSections: {
          ...state.expandedSections,
          [action.actorId]: isExpanded
            ? actorSections.filter(s => s !== action.section)
            : [...actorSections, action.section],
        },
      };
    }

    case 'SET_EXPANDED_SECTIONS':
      return {
        ...state,
        expandedSections: {
          ...state.expandedSections,
          [action.actorId]: action.sections,
        },
      };

    case 'SET_TAB':
      return {
        ...state,
        activeTab: {
          ...state.activeTab,
          [action.actorId]: action.tab,
        },
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Context
interface ReviewContextValue {
  state: ReviewState;
  dispatch: React.Dispatch<ReviewAction>;
  // Convenience methods
  selectActor: (actorId: string | null) => void;
  setSearch: (query: string) => void;
  toggleComparison: () => void;
  toggleSection: (actorId: string, section: string) => void;
  setExpandedSections: (actorId: string, sections: string[]) => void;
  setTab: (actorId: string, tab: 'sections' | 'documents') => void;
  isExpanded: (actorId: string, section: string) => boolean;
  getActiveTab: (actorId: string) => 'sections' | 'documents';
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

// Provider
export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  const value: ReviewContextValue = {
    state,
    dispatch,
    selectActor: (actorId) => dispatch({ type: 'SELECT_ACTOR', actorId }),
    setSearch: (query) => dispatch({ type: 'SET_SEARCH', query }),
    toggleComparison: () => dispatch({ type: 'TOGGLE_COMPARISON' }),
    toggleSection: (actorId, section) =>
      dispatch({ type: 'TOGGLE_SECTION', actorId, section }),
    setExpandedSections: (actorId, sections) =>
      dispatch({ type: 'SET_EXPANDED_SECTIONS', actorId, sections }),
    setTab: (actorId, tab) => dispatch({ type: 'SET_TAB', actorId, tab }),
    isExpanded: (actorId, section) =>
      state.expandedSections[actorId]?.includes(section) ?? false,
    getActiveTab: (actorId) => state.activeTab[actorId] ?? 'sections',
  };

  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  );
}

// Hook
export function useReview() {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
}

// Export types for external use
export type { ReviewState, ReviewAction };
