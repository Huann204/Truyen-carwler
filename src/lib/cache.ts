interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<V> {
  private store = new Map<string, CacheEntry<V>>();
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh insertion order for basic LRU eviction
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlSeconds: number): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

interface AppCacheStore {
  gridCache: TtlCache<unknown>;
  metaCache: TtlCache<unknown>;
  storyCache: TtlCache<unknown>;
  chapterCache: TtlCache<unknown>;
}

declare global {
  // eslint-disable-next-line no-var
  var _truyenAppCaches: AppCacheStore | undefined;
}

const caches: AppCacheStore = global._truyenAppCaches ?? {
  gridCache: new TtlCache<unknown>(100),
  metaCache: new TtlCache<unknown>(30),
  storyCache: new TtlCache<unknown>(300),
  chapterCache: new TtlCache<unknown>(150),
};

if (!global._truyenAppCaches) {
  global._truyenAppCaches = caches;
}

export const gridCache = caches.gridCache;
export const metaCache = caches.metaCache;
export const storyCache = caches.storyCache;
export const chapterCache = caches.chapterCache;

export function invalidateAllStoryCaches(slug?: string): void {
  gridCache.clear();
  metaCache.clear();
  if (slug) {
    storyCache.delete(`story:${slug}`);
    storyCache.delete(`chapters:${slug}`);
    storyCache.deleteByPrefix("related:");
    chapterCache.deleteByPrefix(`chap:${slug}:`);
  } else {
    storyCache.clear();
    chapterCache.clear();
  }
}
