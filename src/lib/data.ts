import "server-only";
import { asc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { images, items, lists, sections, type Item, type List, type Section } from "@/db/schema";

export type ListWithItems = { list: List; sections: Section[]; items: Item[] };

export async function getList(id: number): Promise<ListWithItems | null> {
  if (!Number.isInteger(id)) return null;
  const list = await db.query.lists.findFirst({ where: eq(lists.id, id) });
  if (!list) return null;
  const [s, i] = await Promise.all([
    db.select().from(sections).where(eq(sections.listId, id)).orderBy(asc(sections.position), asc(sections.id)),
    db
      .select({ ...getTableColumns(items), imageId: images.id })
      .from(items)
      .leftJoin(images, eq(images.itemId, items.id))
      .where(eq(items.listId, id))
      .orderBy(asc(items.position), asc(items.id)),
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

// The picture bytes for every wish on a list that has one, keyed by item id.
export async function getListImages(listId: number) {
  const rows = await db
    .select({ itemId: images.itemId, mime: images.mime, data: images.data })
    .from(images)
    .innerJoin(items, eq(items.id, images.itemId))
    .where(eq(items.listId, listId));
  return new Map(rows.map((r) => [r.itemId, r]));
}
