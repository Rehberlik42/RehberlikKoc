"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "mindora:sidebar-expanded";
const CHANGE_EVENT = "mindora-sidebar-expanded";

function readExpanded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

/**
 * Masaüstü sidebar açık/kapalı tercihi.
 * SSR + hydration ilk paint'te her zaman açık (true); sonra localStorage uygulanır.
 */
export function useSidebarExpanded() {
  const expanded = useSyncExternalStore(subscribe, readExpanded, () => true);

  const setExpanded = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // private mode
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded(!readExpanded());
  }, [setExpanded]);

  return { expanded, setExpanded, toggleExpanded };
}
