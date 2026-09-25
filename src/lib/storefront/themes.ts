import type { CSSProperties } from "react";

export type ThemeKey = "minimal" | "editorial" | "local" | "premium" | "restaurant";

export type ThemeDefaults = {
  colors: { primary: string; accent: string; background: string; text: string; muted: string; border: string };
  typography: { headingFont: "sans" | "serif" | "display"; bodyFont: "sans" | "serif"; scale: "compact" | "comfortable" | "large" };
  radius: "none" | "sm" | "md" | "lg";
  buttonStyle: "solid" | "outline" | "pill";
};

export type ThemeDef = { key: ThemeKey; label: string; description: string; defaults: ThemeDefaults };

const FONT_STACKS = {
  sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  serif: "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
  display: "Iowan Old Style, Palatino Linotype, Book Antiqua, Palatino, Georgia, serif",
};

const RADIUS: Record<ThemeDefaults["radius"], string> = { none: "0px", sm: "4px", md: "8px", lg: "16px" };

const SCALES: Record<ThemeDefaults["typography"]["scale"], { h1: string; h2: string; h3: string; body: string }> = {
  compact: { h1: "1.75rem", h2: "1.35rem", h3: "1.05rem", body: "0.9375rem" },
  comfortable: { h1: "2.25rem", h2: "1.6rem", h3: "1.2rem", body: "1rem" },
  large: { h1: "2.75rem", h2: "1.9rem", h3: "1.35rem", body: "1.0625rem" },
};

export const THEME_KEYS: ThemeKey[] = ["minimal", "editorial", "local", "premium", "restaurant"];

export const THEMES: Record<ThemeKey, ThemeDef> = {
  minimal: {
    key: "minimal",
    label: "Minimal",
    description: "Crisp neutrals, sans headings, tight corners.",
    defaults: {
      colors: { primary: "#111827", accent: "#059669", background: "#ffffff", text: "#111827", muted: "#6b7280", border: "#e5e7eb" },
      typography: { headingFont: "sans", bodyFont: "sans", scale: "comfortable" },
      radius: "sm",
      buttonStyle: "solid",
    },
  },
  editorial: {
    key: "editorial",
    label: "Editorial",
    description: "Serif headlines on warm paper tones.",
    defaults: {
      colors: { primary: "#1c1917", accent: "#b45309", background: "#fafaf9", text: "#1c1917", muted: "#78716c", border: "#e7e5e4" },
      typography: { headingFont: "serif", bodyFont: "sans", scale: "large" },
      radius: "none",
      buttonStyle: "solid",
    },
  },
  local: {
    key: "local",
    label: "Local",
    description: "Fresh greens built for neighbourhood shops.",
    defaults: {
      colors: { primary: "#15803d", accent: "#ea580c", background: "#ffffff", text: "#14532d", muted: "#4b5563", border: "#d1fae5" },
      typography: { headingFont: "sans", bodyFont: "sans", scale: "comfortable" },
      radius: "md",
      buttonStyle: "pill",
    },
  },
  premium: {
    key: "premium",
    label: "Premium",
    description: "Gold accents, display serif, generous corners.",
    defaults: {
      colors: { primary: "#18181b", accent: "#a16207", background: "#ffffff", text: "#18181b", muted: "#71717a", border: "#e4e4e7" },
      typography: { headingFont: "display", bodyFont: "serif", scale: "comfortable" },
      radius: "lg",
      buttonStyle: "outline",
    },
  },
  restaurant: {
    key: "restaurant",
    label: "Restaurant",
    description: "Warm cream and chilli red for menus.",
    defaults: {
      colors: { primary: "#b91c1c", accent: "#f59e0b", background: "#fffaf5", text: "#1c1917", muted: "#78716c", border: "#f0e7dd" },
      typography: { headingFont: "display", bodyFont: "sans", scale: "comfortable" },
      radius: "md",
      buttonStyle: "solid",
    },
  },
};

export function getTheme(key: string | null | undefined): ThemeDef {
  return THEMES[(key ?? "") as ThemeKey] ?? THEMES.minimal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(source: Record<string, unknown>, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function pickEnum<T extends string>(source: Record<string, unknown>, key: string, allowed: readonly T[], fallback: T): T {
  const value = source[key];
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function resolveThemeSettings(theme: ThemeDef, settings?: Record<string, unknown> | null): ThemeDefaults {
  const raw = isRecord(settings) ? settings : {};
  const colors = isRecord(raw.colors) ? raw.colors : {};
  const typography = isRecord(raw.typography) ? raw.typography : {};
  const defaults = theme.defaults;
  return {
    colors: {
      primary: pickString(colors, "primary", defaults.colors.primary),
      accent: pickString(colors, "accent", defaults.colors.accent),
      background: pickString(colors, "background", defaults.colors.background),
      text: pickString(colors, "text", defaults.colors.text),
      muted: pickString(colors, "muted", defaults.colors.muted),
      border: pickString(colors, "border", defaults.colors.border),
    },
    typography: {
      headingFont: pickEnum(typography, "headingFont", ["sans", "serif", "display"] as const, defaults.typography.headingFont),
      bodyFont: pickEnum(typography, "bodyFont", ["sans", "serif"] as const, defaults.typography.bodyFont),
      scale: pickEnum(typography, "scale", ["compact", "comfortable", "large"] as const, defaults.typography.scale),
    },
    radius: pickEnum(raw, "radius", ["none", "sm", "md", "lg"] as const, defaults.radius),
    buttonStyle: pickEnum(raw, "buttonStyle", ["solid", "outline", "pill"] as const, defaults.buttonStyle),
  };
}

function readableOn(hex: string): string {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((part) => part + part).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#ffffff";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111111" : "#ffffff";
}

export function themeVariables(theme: ThemeDef, settings?: Record<string, unknown> | null): CSSProperties {
  const merged = resolveThemeSettings(theme, settings);
  const scale = SCALES[merged.typography.scale];
  const outline = merged.buttonStyle === "outline";
  const variables = {
    "--sf-color-primary": merged.colors.primary,
    "--sf-color-accent": merged.colors.accent,
    "--sf-color-background": merged.colors.background,
    "--sf-color-text": merged.colors.text,
    "--sf-color-muted": merged.colors.muted,
    "--sf-color-border": merged.colors.border,
    "--sf-color-on-primary": readableOn(merged.colors.primary),
    "--sf-font-heading": FONT_STACKS[merged.typography.headingFont],
    "--sf-font-body": FONT_STACKS[merged.typography.bodyFont],
    "--sf-radius": RADIUS[merged.radius],
    "--sf-radius-button": merged.buttonStyle === "pill" ? "9999px" : RADIUS[merged.radius],
    "--sf-button-bg": outline ? "transparent" : merged.colors.primary,
    "--sf-button-fg": outline ? merged.colors.primary : readableOn(merged.colors.primary),
    "--sf-button-border": merged.colors.primary,
    "--sf-h1": scale.h1,
    "--sf-h2": scale.h2,
    "--sf-h3": scale.h3,
    "--sf-body": scale.body,
  };
  return variables as CSSProperties;
}

export function sfButtonStyle(): CSSProperties {
  return {
    background: "var(--sf-button-bg)",
    color: "var(--sf-button-fg)",
    border: "1px solid var(--sf-button-border)",
    borderRadius: "var(--sf-radius-button)",
  };
}

export function sfOutlineButtonStyle(): CSSProperties {
  return {
    background: "transparent",
    color: "var(--sf-color-primary)",
    border: "1px solid var(--sf-color-border)",
    borderRadius: "var(--sf-radius-button)",
  };
}
