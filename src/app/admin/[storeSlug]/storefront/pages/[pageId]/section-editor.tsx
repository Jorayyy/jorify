"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { savePageMeta, savePageSections } from "@/lib/actions/storefront";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type SectionOption = { type: string; label: string; defaults: Record<string, string | number> };

export type EditorSection = { id: string; type: string; enabled: boolean; settings: Record<string, unknown> };

const MULTILINE_KEYS = ["body", "items", "images", "text"];

function labelize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function hintFor(key: string): string | null {
  if (key === "items") return "One per line: Question|Answer for FAQ, Name|Quote for testimonials";
  if (key === "linkHref" || key === "buttonHref") return "Path such as /products";
  if (key === "images") return "One image URL per line";
  if (key === "limit") return "How many items to show";
  return null;
}

export function SectionEditor({
  storeSlug,
  page,
  sections,
  options,
  canEdit,
}: {
  storeSlug: string;
  page: {
    id: string;
    title: string;
    slug: string;
    isHomepage: boolean;
    published: boolean;
    seoTitle: string;
    seoDescription: string;
  };
  sections: EditorSection[];
  options: SectionOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [items, setItems] = React.useState<EditorSection[]>(sections);
  const [activeId, setActiveId] = React.useState(sections[0]?.id ?? "");
  const [tab, setTab] = React.useState<"sections" | "page">("sections");
  const [pending, setPending] = React.useState(false);
  const [addType, setAddType] = React.useState("");
  const [meta, setMeta] = React.useState({
    title: page.title,
    slug: page.slug,
    published: page.published,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  });

  const optionByType = React.useMemo(() => new Map(options.map((option) => [option.type, option])), [options]);
  const active = items.find((item) => item.id === activeId) ?? null;
  const activeOption = active ? optionByType.get(active.type) ?? null : null;

  function addSection() {
    const type = addType || options[0]?.type;
    const option = type ? optionByType.get(type) : undefined;
    if (!option) return;
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, type: option.type, enabled: true, settings: { ...option.defaults } }]);
    setActiveId(id);
    setAddType("");
  }

  function move(index: number, direction: -1 | 1) {
    setItems((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? "");
      return next;
    });
  }

  function toggle(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
  }

  function updateSetting(key: string, value: unknown) {
    if (!active) return;
    setItems((current) =>
      current.map((item) => (item.id === active.id ? { ...item, settings: { ...item.settings, [key]: value } } : item)),
    );
  }

  async function saveSections() {
    setPending(true);
    try {
      const result = await savePageSections(storeSlug, page.id, items);
      if (result?.ok) {
        toast.push("Sections saved");
        router.refresh();
      } else {
        toast.push(result?.error ?? "Could not save sections", "error");
      }
    } finally {
      setPending(false);
    }
  }

  async function saveDetails() {
    if (!meta.title.trim()) {
      toast.push("Give the page a title", "error");
      return;
    }
    if (!page.isHomepage && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) {
      toast.push("URL: use lowercase letters, numbers and dashes", "error");
      return;
    }
    setPending(true);
    try {
      const seo: Record<string, string> = {};
      if (meta.seoTitle.trim()) seo.title = meta.seoTitle.trim();
      if (meta.seoDescription.trim()) seo.description = meta.seoDescription.trim();
      const result = await savePageMeta(storeSlug, page.id, {
        title: meta.title.trim(),
        slug: page.isHomepage ? page.slug : meta.slug,
        published: meta.published,
        seo,
      });
      if (result?.ok) {
        toast.push("Page details saved");
        router.refresh();
      } else {
        toast.push(result?.error ?? "Could not save page details", "error");
      }
    } finally {
      setPending(false);
    }
  }

  const fieldClass = "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-600">
          {meta.published ? "Published" : "Draft"}
        </span>
        {page.isHomepage ? (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-600">Home</span>
        ) : null}
        <span className="text-sm text-zinc-500">{items.length} sections</span>
        <div className="ml-auto flex gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("sections")}
            className={tab === "sections" ? "rounded-md bg-zinc-900 px-3 py-1.5 text-white" : "rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100"}
          >
            Sections
          </button>
          <button
            type="button"
            onClick={() => setTab("page")}
            className={tab === "page" ? "rounded-md bg-zinc-900 px-3 py-1.5 text-white" : "rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100"}
          >
            Page details
          </button>
        </div>
      </div>

      {tab === "sections" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
          <div className="h-fit rounded-md border border-zinc-200 bg-white p-3">
            {canEdit ? (
              <div className="mb-3 flex gap-2">
                <select
                  value={addType}
                  onChange={(event) => setAddType(event.target.value)}
                  aria-label="Section type"
                  className="h-9 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm"
                >
                  <option value="">Choose a section</option>
                  {options.map((option) => (
                    <option key={option.type} value={option.type}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" className="h-9" onClick={addSection}>
                  Add
                </Button>
              </div>
            ) : null}

            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-zinc-500">No sections on this page yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((item, index) => {
                  const option = optionByType.get(item.type);
                  const isActive = item.id === activeId;
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm ${
                        isActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveId(item.id)}
                        className="min-w-0 flex-1 truncate text-left"
                      >
                        <span className="font-medium text-zinc-900">{option?.label ?? item.type}</span>
                        {!item.enabled ? <span className="ml-1.5 text-[10px] uppercase text-zinc-400">hidden</span> : null}
                        {!option ? <span className="ml-1.5 text-[10px] uppercase text-red-500">unsupported</span> : null}
                      </button>
                      {canEdit ? (
                        <span className="flex items-center">
                          <button
                            type="button"
                            aria-label="Move up"
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                            className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            disabled={index === items.length - 1}
                            onClick={() => move(index, 1)}
                            className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={item.enabled ? "Hide section" : "Show section"}
                            onClick={() => toggle(item.id)}
                            className={`ml-0.5 h-3.5 w-3.5 rounded-[3px] border ${
                              item.enabled ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-white"
                            }`}
                          />
                          <button
                            type="button"
                            aria-label="Remove section"
                            onClick={() => remove(item.id)}
                            className="ml-1 rounded p-1 text-zinc-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-4">
            {!active ? (
              <p className="py-8 text-center text-sm text-zinc-500">Pick a section on the left to edit it.</p>
            ) : !activeOption ? (
              <div>
                <p className="text-sm font-medium text-zinc-900">{active.type}</p>
                <p className="mt-1 text-sm text-red-600">
                  This section type is not supported and will be hidden on the storefront.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-zinc-900">{activeOption.label}</h2>
                  {canEdit ? (
                    <Button type="button" size="sm" onClick={saveSections} disabled={pending}>
                      {pending ? "Saving" : "Save sections"}
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(activeOption.defaults).map(([key, fallback]) => {
                    const raw = active.settings[key] ?? fallback;
                    const value = typeof raw === "string" ? raw : JSON.stringify(raw);
                    const multiline = MULTILINE_KEYS.includes(key) || (typeof fallback === "string" && fallback.length > 60);
                    const hint = hintFor(key);
                    return (
                      <div key={key} className={key === "body" || key === "items" || key === "images" ? "sm:col-span-2" : ""}>
                        <label className="block text-xs font-medium text-zinc-500">{labelize(key)}</label>
                        {multiline ? (
                          <textarea
                            value={value}
                            disabled={!canEdit}
                            onChange={(event) => updateSetting(key, event.target.value)}
                            rows={key === "items" || key === "images" ? 5 : 4}
                            className={fieldClass}
                          />
                        ) : typeof fallback === "number" ? (
                          <Input
                            type="number"
                            value={value}
                            disabled={!canEdit}
                            onChange={(event) => updateSetting(key, Number(event.target.value))}
                            className="mt-1"
                          />
                        ) : (
                          <Input
                            value={value}
                            disabled={!canEdit}
                            onChange={(event) => updateSetting(key, event.target.value)}
                            className="mt-1"
                          />
                        )}
                        {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">Page details</h2>
            {canEdit ? (
              <Button type="button" size="sm" onClick={saveDetails} disabled={pending}>
                {pending ? "Saving" : "Save details"}
              </Button>
            ) : null}
          </div>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-500">Title</label>
              <Input
                value={meta.title}
                disabled={!canEdit}
                onChange={(event) => setMeta((current) => ({ ...current, title: event.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500">URL</label>
              <Input
                value={page.isHomepage ? "/" : meta.slug}
                disabled={!canEdit || page.isHomepage}
                onChange={(event) => setMeta((current) => ({ ...current, slug: event.target.value }))}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-zinc-400">
                {page.isHomepage ? "The homepage is served at the root of the store" : `Served at /${storeSlug}/your-url`}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={meta.published}
                disabled={!canEdit}
                onChange={(event) => setMeta((current) => ({ ...current, published: event.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Published
            </label>
            <div />
            <div>
              <label className="block text-xs font-medium text-zinc-500">SEO title</label>
              <Input
                value={meta.seoTitle}
                disabled={!canEdit}
                onChange={(event) => setMeta((current) => ({ ...current, seoTitle: event.target.value }))}
                className="mt-1"
                maxLength={70}
              />
              <p className="mt-1 text-xs text-zinc-400">Up to 70 characters. Defaults to the page title.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500">SEO description</label>
              <textarea
                value={meta.seoDescription}
                disabled={!canEdit}
                onChange={(event) => setMeta((current) => ({ ...current, seoDescription: event.target.value }))}
                rows={3}
                maxLength={160}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-zinc-400">Up to 160 characters.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
