import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, lists, sections, type Item, type List, type Section } from "@/db/schema";

export type ListWithItems = { list: List; sections: Section[]; items: Item[] };

export async function getList(id: number): Promise<ListWithItems | null> {
  if (!Number.isInteger(id)) return null;
  const list = await db.query.lists.findFirst({ where: eq(lists.id, id) });
  if (!list) return null;
  const [s, i] = await Promise.all([
    db.select().from(sections).where(eq(sections.listId, id)).orderBy(asc(sections.position), asc(sections.id)),
    db.select().from(items).where(eq(items.listId, id)).orderBy(asc(items.position), asc(items.id)),
  ]);
  return { list, sections: s, items: i };
}

// Groups items for display: unsectioned wishes first, then each section in order.
export function groupItems({ sections, items }: Pick<ListWithItems, "sections" | "items">) {
  const known = new Set(sections.map((s) => s.id));
  const loose = items.filter((i) => i.sectionId === null || !known.has(i.sectionId));
  return [
    { section: null as Section | null, items: loose },
    ...sections.map((section) => ({ section, items: items.filter((i) => i.sectionId === section.id) })),
  ];
}
