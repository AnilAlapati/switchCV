import { InMemoryCache } from "./cache";

describe("InMemoryCache", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should set and get a value", () => {
    const cache = new InMemoryCache<string>();
    cache.set("key", "value", 60000);
    expect(cache.get("key")).toBe("value");
  });

  it("should return null for non-existent key", () => {
    const cache = new InMemoryCache<string>();
    expect(cache.get("non-existent")).toBeNull();
  });

  it("should expire values after TTL", () => {
    const cache = new InMemoryCache<string>();
    cache.set("key", "value", 1000); // 1 second TTL
    expect(cache.get("key")).toBe("value");

    jest.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeNull();
  });

  it("should evict oldest entry when maxSize is reached", () => {
    const cache = new InMemoryCache<string>(2);
    cache.set("key1", "value1", 60000);
    cache.set("key2", "value2", 60000);
    expect(cache.get("key1")).toBe("value1");
    expect(cache.get("key2")).toBe("value2");

    cache.set("key3", "value3", 60000);
    expect(cache.get("key1")).toBeNull(); // Evicted
    expect(cache.get("key2")).toBe("value2");
    expect(cache.get("key3")).toBe("value3");
  });

  it("should clear the cache", () => {
    const cache = new InMemoryCache<string>();
    cache.set("key1", "value1", 60000);
    cache.set("key2", "value2", 60000);
    cache.clear();
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
  });
});
