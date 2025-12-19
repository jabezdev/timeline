import { createContext, useContext, useRef, useCallback } from 'react';

interface DropInfo {
  id: string;
  rect: DOMRect;
}

interface DropAnimationContextValue {
  registerDrop: (id: string, rect: DOMRect) => void;
  consumeDropInfo: (id: string) => DropInfo | null;
}

const DropAnimationContext = createContext<DropAnimationContextValue | null>(null);

export function DropAnimationProvider({ children }: { children: React.ReactNode }) {
  const droppedItemsRef = useRef<Map<string, DropInfo>>(new Map());

  const registerDrop = useCallback((id: string, rect: DOMRect) => {
    droppedItemsRef.current.set(id, { id, rect });
  }, []);

  const consumeDropInfo = useCallback((id: string): DropInfo | null => {
    const info = droppedItemsRef.current.get(id);
    if (info) {
      droppedItemsRef.current.delete(id);
      return info;
    }
    return null;
  }, []);

  return (
    <DropAnimationContext.Provider value={{ registerDrop, consumeDropInfo }}>
      {children}
    </DropAnimationContext.Provider>
  );
}

export function useDropAnimation() {
  const context = useContext(DropAnimationContext);
  if (!context) {
    throw new Error('useDropAnimation must be used within a DropAnimationProvider');
  }
  return context;
}
