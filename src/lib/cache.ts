interface CacheEntry<V> {
  value: V;
  freshUntil: number;
  staleUntil: number;
}

export class TtlCache<V> {
  private store = new Map<string, CacheEntry<V>>();
  private inFlight = new Map<string, Promise<V>>();
  private readonly maxEntries: number;
  private generation = 0;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.staleUntil) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(
    key: string,
    value: V,
    freshTtlSeconds: number,
    staleTtlSeconds = freshTtlSeconds * 5
  ): void {
    const now = Date.now();
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
      freshUntil: now + freshTtlSeconds * 1000,
      staleUntil: now + Math.max(freshTtlSeconds, staleTtlSeconds) * 1000,
    });
  }

  async getOrLoadSWR<T extends V>(
    key: string,
    freshTtlSeconds: number,
    staleTtlSeconds: number,
    loader: () => Promise<T>,
    shouldCache?: (val: T) => boolean
  ): Promise<T> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry && now <= entry.staleUntil) {
      // Refresh LRU position
      this.store.delete(key);
      this.store.set(key, entry);

      // Stale hit -> trigger silent background refresh without blocking caller
      if (now > entry.freshUntil && !this.inFlight.has(key)) {
        const gen = this.generation;
        const bg = loader()
          .then((freshVal) => {
            if (this.generation === gen && (!shouldCache || shouldCache(freshVal))) {
              this.set(key, freshVal, freshTtlSeconds, staleTtlSeconds);
            }
            return freshVal;
          })
          .catch(() => entry.value as T)
          .finally(() => {
            this.inFlight.delete(key);
          });
        this.inFlight.set(key, bg);
      }

      return entry.value as T;
    }

    if (entry) {
      this.store.delete(key);
    }

    const existingFlight = this.inFlight.get(key);
    if (existingFlight) {
      return existingFlight as Promise<T>;
    }

    const gen = this.generation;
    const promise = loader()
      .then((val) => {
        if (this.generation === gen && (!shouldCache || shouldCache(val))) {
          this.set(key, val, freshTtlSeconds, staleTtlSeconds);
        }
        return val;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  delete(key: string): void {
    this.generation++;
    this.store.delete(key);
    this.inFlight.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    this.generation++;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
    for (const k of this.inFlight.keys()) {
      if (k.startsWith(prefix)) {
        this.inFlight.delete(k);
      }
    }
  }

  clear(): void {
    this.generation++;
    this.store.clear();
    this.inFlight.clear();
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
