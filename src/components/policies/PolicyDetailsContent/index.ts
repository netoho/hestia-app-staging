export { default } from './PolicyDetailsContent';
export { default as PolicyDetailsContent } from './PolicyDetailsContent';

// Re-export components for potential external use
export { PolicyHeader } from './components/PolicyHeader';
export { PolicyProgressBar } from './components/PolicyProgressBar';
export { ActorViewToggle } from './components/ActorViewToggle';
export { MarkCompleteDialog } from './components/MarkCompleteDialog';
export { ActorTabSkeleton } from './components/ActorTabSkeleton';

// Re-export tabs
export * from './tabs';

// Re-export hook
export { usePolicyActions } from './hooks/usePolicyActions';
