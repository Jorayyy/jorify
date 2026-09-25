"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { saveThemeSettings } from "@/lib/actions/storefront";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { THEMES, THEME_KEYS, type ThemeKey, type ThemeDefaults } from "@/lib/storefront/themes";

const COLOR_LABELS: Record<keyof ThemeDefaults["colors"], string> = {
  primary: "Primary",
  accent: "Accent",
  background: "Background",
  text: "Text",
  muted: "Muted",
  border: "Border",
};

const RADIUS_PX: Record<ThemeDefaults["radius"], string> = { none: "0px", sm: "4px", md: "8px", lg: "16px" };

export function ThemeEditor({
  storeSlug,
  initial,
  canEdit,
}: {
  storeSlug: string;
  initial: { themeKey: ThemeKey } & ThemeDefaults;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [themeKey, setThemeKey] = React.useState<ThemeKey>(initial.themeKey);
  const [settings, setSettings] = React.useState<ThemeDefaults>(initial);
  const [pending, setPending] = React.useState(false);

  function pickPreset(key: ThemeKey) {
    setThemeKey(key);
    setSettings(structuredClone(THEMES[key].defaults));
  }

  function setColor(key: keyof ThemeDefaults["colors"], value: string) {
    setSettings((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
  }

  async function save() {
    setPending(true);
    try {
      const result = await saveThemeSettings(storeSlug, { themeKey, ...settings });
      if (result?.ok) {
        toast.push("Theme saved");
        router.refresh();
      } else {
        toast.push(result?.error ?? "Could not save the theme", "error");
      }
    } finally {
      setPending(false);
    }
  }

  const selectClass = "mt-1 h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900";
  const radius = settings.buttonStyle === "pill" ? "9999px" : RADIUS_PX[settings.radius];
  const previewButton =
    settings.buttonStyle === "outline"
      ? { background: "transparent", color: settings.colors.primary, border: `2px solid ${settings.colors.primary}`, borderRadius: radius }
      : { background: settings.colors.primary, color: "#ffffff", border: `2px solid ${settings.colors.primary}`, borderRadius: radius };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Presets set sensible defaults. Your edits stay until you save.</p>
        {canEdit ? (
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving" : "Save theme"}
          </Button>
        ) : (
          <p className="text-xs font-medium text-zinc-400">You have view-only access</p>
        )}
      </div>

      <section className="rounded-md border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Preset</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {THEME_KEYS.map((key) => {
            const preset = THEMES[key];
            const active = themeKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => canEdit && pickPreset(key)}
                disabled={!canEdit}
                className={`rounded-md border p-3 text-left disabled:cursor-not-allowed disabled:opacity-70 ${
                  active ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <span className="flex gap-1.5">
                  <span
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ background: preset.defaults.colors.primary }}
                  />
                  <span
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ background: preset.defaults.colors.accent }}
                  />
                  <span
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ background: preset.defaults.colors.background }}
                  />
                </span>
                <span className="mt-2 block text-sm font-medium text-zinc-900">{preset.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{preset.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Colours</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(COLOR_LABELS) as (keyof ThemeDefaults["colors"])[]).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={settings.colors[key]}
                disabled={!canEdit}
                onChange={(event) => setColor(key, event.target.value)}
                aria-label={COLOR_LABELS[key]}
                className="h-9 w-11 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
              />
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-500">{COLOR_LABELS[key]}</label>
                <input
                  value={settings.colors[key]}
                  disabled={!canEdit}
                  onChange={(event) => setColor(key, event.target.value)}
                  className="mt-0.5 w-28 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs uppercase text-zinc-700"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Typography and shape</h2>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500">Heading font</label>
            <select
              value={settings.typography.headingFont}
              disabled={!canEdit}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  typography: { ...current.typography, headingFont: event.target.value as ThemeDefaults["typography"]["headingFont"] },
                }))
              }
              className={selectClass}
            >
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
              <option value="display">Display</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">Body font</label>
            <select
              value={settings.typography.bodyFont}
              disabled={!canEdit}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  typography: { ...current.typography, bodyFont: event.target.value as ThemeDefaults["typography"]["bodyFont"] },
                }))
              }
              className={selectClass}
            >
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">Text size</label>
            <select
              value={settings.typography.scale}
              disabled={!canEdit}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  typography: { ...current.typography, scale: event.target.value as ThemeDefaults["typography"]["scale"] },
                }))
              }
              className={selectClass}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">Corners</label>
            <select
              value={settings.radius}
              disabled={!canEdit}
              onChange={(event) => setSettings((current) => ({ ...current, radius: event.target.value as ThemeDefaults["radius"] }))}
              className={selectClass}
            >
              <option value="none">Square</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">Button style</label>
            <select
              value={settings.buttonStyle}
              disabled={!canEdit}
              onChange={(event) => setSettings((current) => ({ ...current, buttonStyle: event.target.value as ThemeDefaults["buttonStyle"] }))}
              className={selectClass}
            >
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
              <option value="pill">Pill</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">Preview</label>
            <div
              className="mt-1 inline-flex h-9 items-center px-4 text-sm font-medium"
              style={previewButton}
            >
              Shop now
            </div>
          </div>
        </div>
      </section>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving" : "Save theme"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
