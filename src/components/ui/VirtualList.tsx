'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight?: number;
  estimatedItemHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export default function VirtualList<T>({
  items,
  height,
  itemHeight,
  estimatedItemHeight = 100,
  renderItem,
  overscan = 3,
  className = '',
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [heights, setHeights] = useState<Map<number, number>>(new Map());

  const getItemHeight = useCallback(
    (index: number): number => {
      if (itemHeight) return itemHeight;
      return heights.get(index) || estimatedItemHeight;
    },
    [itemHeight, heights, estimatedItemHeight]
  );

  const getTotalHeight = useCallback(() => {
    if (itemHeight) return items.length * itemHeight;

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [items.length, itemHeight, getItemHeight]);

  const getItemOffset = useCallback(
    (index: number): number => {
      if (itemHeight) return index * itemHeight;

      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    },
    [itemHeight, getItemHeight]
  );

  const findStartIndex = useCallback(() => {
    let offset = 0;
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (offset + height > scrollTop) {
        return Math.max(0, i - overscan);
      }
      offset += height;
    }
    return 0;
  }, [items.length, getItemHeight, scrollTop, overscan]);

  const findEndIndex = useCallback(
    (startIndex: number) => {
      let offset = getItemOffset(startIndex);
      for (let i = startIndex; i < items.length; i++) {
        if (offset > scrollTop + height) {
          return Math.min(items.length - 1, i + overscan);
        }
        offset += getItemHeight(i);
      }
      return items.length - 1;
    },
    [items.length, getItemHeight, getItemOffset, scrollTop, height, overscan]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const measureItem = useCallback((index: number, element: HTMLDivElement | null) => {
    if (!element || itemHeight) return;

    const height = element.getBoundingClientRect().height;
    setHeights((prev) => {
      if (prev.get(index) === height) return prev;
      const next = new Map(prev);
      next.set(index, height);
      return next;
    });
  }, [itemHeight]);

  const startIndex = findStartIndex();
  const endIndex = findEndIndex(startIndex);
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = getItemOffset(startIndex);
  const totalHeight = getTotalHeight();

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i;
          return (
            <div
              key={index}
              ref={(el) => measureItem(index, el)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${getItemOffset(index)}px)`,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
