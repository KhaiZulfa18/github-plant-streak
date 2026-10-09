type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<unknown>>();

/** Cache in-memory sederhana supaya tidak boros rate limit GitHub. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await fn();
  store.set(key, { value, expires: Date.now() + ttlMs });
  if (store.size > 500) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  return value;
}
