import type { PageSection } from "@/lib/db/schema";
import { SECTION_REGISTRY, mergeSectionSettings, type StorefrontStore } from "@/lib/storefront/sections";

export function SectionList({ store, sections }: { store: StorefrontStore; sections: PageSection[] | null | undefined }) {
  if (!sections || sections.length === 0) return null;
  return sections.map((section) => {
    const def = SECTION_REGISTRY[section.type];
    if (!def || !section.enabled) return null;
    const Component = def.component;
    const settings = mergeSectionSettings(def.settingsDefaults, section.settings);
    return <Component key={section.id} store={store} settings={settings} section={section} />;
  });
}
