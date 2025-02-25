import { Edge, Section } from '../types';

export interface ListContextValue {
  getListLength: () => number;
  registerSection: (entry: { sectionId: string; element: HTMLElement }) => () => void;
  reorderSection: (args: {
    startIndex: number;
    indexOfTarget: number;
    closestEdgeOfTarget: Edge | null;
  }) => void;
  instanceId: symbol;
}

export interface ListState {
  sections: Section[];
  lastSectionMoved: {
    section: Section;
    previousIndex: number;
    currentIndex: number;
    numberOfSections: number;
  } | null;
}

export function getSectionRegistry() {
  const registry = new Map<string, HTMLElement>();

  function register({ sectionId, element }: { sectionId: string; element: HTMLElement }) {
    registry.set(sectionId, element);
    return function unregister() {
      registry.delete(sectionId);
    };
  }

  function getElement(sectionId: string): HTMLElement | null {
    return registry.get(sectionId) ?? null;
  }

  return { register, getElement };
}

export function reorderArray<T>(
  list: T[],
  startIndex: number,
  targetIndex: number,
  targetEdge: Edge | null
): T[] {
  // Deep copy the array
  const result = [...list];
  
  // Remove the item from its original position
  const [removed] = result.splice(startIndex, 1);
  
  // Calculate the new destination index
  const destinationIndex = calculateDestinationIndex(
    startIndex,
    targetIndex,
    targetEdge
  );
  
  // Insert at the new position
  result.splice(destinationIndex, 0, removed);
  
  return result;
}

export function calculateDestinationIndex(
  startIndex: number,
  targetIndex: number,
  targetEdge: Edge | null
): number {
  // If dropping on top/left edges, place before the target
  if (targetEdge === 'top' || targetEdge === 'left') {
    return targetIndex;
  }
  
  // If dropping on bottom/right edges, place after the target
  if (targetEdge === 'bottom' || targetEdge === 'right') {
    return targetIndex + 1;
  }
  
  // If no edge specified but target index is after start index, 
  // account for the removal of the item from its original position
  if (targetIndex > startIndex) {
    return targetIndex;
  }
  
  return targetIndex;
} 