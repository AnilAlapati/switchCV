import { TTLCache } from "./cache";

describe("TTLCache", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should set and get a value", () => {
    const cache = new TTLCache<string>();
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("should return undefined for non-existent key", () => {
    const cache = new TTLCache<string>();
    expect(cache.get("non-existent")).toBeUndefined();
  });

  it("should expire values after TTL", () => {
    const cache = new TTLCache<string>(1000); // 1 second TTL
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");

    jest.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeUndefined();
  });

  it("should evict oldest entry when maxEntries is reached", () => {
    const cache = new TTLCache<string>(60000, 2);
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    expect(cache.get("key1")).toBe("value1");
    expect(cache.get("key2")).toBe("value2");

    cache.set("key3", "value3");
    expect(cache.get("key1")).toBeUndefined(); // Evicted
    expect(cache.get("key2")).toBe("value2");
    expect(cache.get("key3")).toBe("value3");
  });

  it("should handle falsy keys during eviction", () => {
    const cache = new TTLCache<string>(60000, 1);
    cache.set("", "empty");
    cache.set("key1", "value1");
    expect(cache.get("")).toBeUndefined();
    expect(cache.get("key1")).toBe("value1");
  });

  it("should handle maxEntries = 0", () => {
    const cache = new TTLCache<string>(60000, 0);
    cache.set("key1", "value1");
    // It still sets it because eviction happens before set and cache was empty
    expect(cache.get("key1")).toBe("value1");
  });

  it("should delete a key", () => {
    const cache = new TTLCache<string>();
    cache.set("key", "value");
    cache.delete("key");
    expect(cache.get("key")).toBeUndefined();
  });

  it("should clear the cache", () => {
    const cache = new TTLCache<string>();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.clear();
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });
});
