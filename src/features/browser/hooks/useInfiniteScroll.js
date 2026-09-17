import { useEffect, useRef } from 'react';

/**
 * IntersectionObserver-driven sentinel for infinite scroll. Attach the
 * returned ref to an element near the end of the list; `onLoadMore` fires
 * when it becomes visible. Safe under SSR (no observer until mount).
 */
export default function useInfiniteScroll({ onLoadMore, disabled = false, rootMargin = '320px' }) {
  const sentinelRef = useRef(null);
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (disabled) return undefined;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMoreRef.current?.();
      }
    }, { rootMargin });

    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled, rootMargin]);

  return sentinelRef;
}
