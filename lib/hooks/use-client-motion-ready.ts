import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * SSR + hydration ilk paint'te false (sunucuyla aynı),
 * hydration sonrası true — giriş animasyonlarını güvenli tetikler.
 */
export function useClientMotionReady() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
