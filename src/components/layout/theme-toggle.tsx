"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { IconButton } from "@/components/ui/icon-button";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

/**
 * The applied theme lives on `<html class="dark">`, written before first paint
 * by the inline script in the root layout. That class *is* the source of truth,
 * so this control reads and writes it rather than keeping a second copy in
 * React state that could disagree with what the visitor is looking at.
 */
const DARK_CLASS = "dark";

/** Whether the dark theme is currently applied. */
function isDark(): boolean {
  return document.documentElement.classList.contains(DARK_CLASS);
}

function subscribe(listener: () => void): () => void {
  // Another tab choosing a theme, and anything else touching the class.
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("storage", listener);

  // No `prefers-color-scheme` listener here, deliberately: an explicit choice
  // is the only thing that changes the theme, so the OS cannot override it.
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", listener);
  };
}

const getSnapshot = (): Theme => (isDark() ? "dark" : "light");

/** The server cannot know the visitor's preference; it emits the default. */
const getServerSnapshot = (): Theme => DEFAULT_THEME;

/**
 * Accessible appearance control.
 *
 * `useSyncExternalStore` is what makes this correct rather than merely
 * convenient: the value differs between server and client by design, and React
 * re-reads it after hydration without a hydration error or a cascading render.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle(DARK_CLASS, next === "dark");
    // `color-scheme` travels with the class in CSS — see globals.css. Setting
    // it here as well would put a style attribute on `<html>` that React did
    // not render, which is a hydration mismatch on every visit.
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience; the toggle still works this session.
    }
  }

  return (
    <IconButton
      type="button"
      size="sm"
      variant="ghost"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} appearance`}
    >
      {theme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </IconButton>
  );
}
