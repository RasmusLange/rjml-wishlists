"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { images, items, lists, sections } from "@/db/schema";
import { checkLogin, endSession, requireUser, startSession } from "@/lib/auth";

function clean(value: FormDataEntryValue | null | undefined): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s : null;
}

// Accept "elgiganten.dk/..." as well as full links, but only ever store http(s).
function cleanUrl(value: FormDataEntryValue | null): string | null {
  const raw = clean(value);
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function touchList(listId: number) {
  await db.update(lists).set({ updatedAt: new Date() }).where(eq(lists.id, listId));
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/");
}

// ── Session ──

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const name = checkLogin(String(form.get("name") ?? ""), String(form.get("password") ?? ""));
  if (!name) return { error: "That name and password don't match." };
  await startSession(name);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

// ── Lists ──

export async function createList(form: FormData) {
  const user = await requireUser();
  const title = clean(form.get("title")) ?? "Wishlist";
  const [list] = await db.insert(lists).values({ title, createdBy: user }).returning({ id: lists.id });
  revalidatePath("/");
  redirect(`/lists/${list.id}`);
}

export async function updateList(listId: number, data: { title: string; intro: string }) {
  await requireUser();
  await db
    .update(lists)
    .set({ title: data.title.trim() || "Wishlist", intro: data.intro.trim() || null })
    .where(eq(lists.id, listId));
  await touchList(listId);
}

export async function duplicateList(listId: number) {
  const user = await requireUser();
  const source = await db.query.lists.findFirst({ where: eq(lists.id, listId) });
  if (!source) return;
  const newId = await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(lists)
      .values({ title: `${source.title} (copy)`, intro: source.intro, createdBy: user })
      .returning({ id: lists.id });
    const oldSections = await tx.select().from(sections).where(eq(sections.listId, listId));
    const sectionMap = new Map<number, number>();
    for (const s of oldSections) {
      const [ns] = await tx
        .insert(sections)
        .values({ listId: copy.id, title: s.title, position: s.position })
        .returning({ id: sections.id });
      sectionMap.set(s.id, ns.id);
    }
    const oldItems = await tx.select().from(items).where(eq(items.listId, listId));
    for (const { id: oldId, createdAt: _c, ...it } of oldItems) {
      const [ni] = await tx
        .insert(items)
        .values({ ...it, listId: copy.id, sectionId: it.sectionId ? (sectionMap.get(it.sectionId) ?? null) : null })
        .returning({ id: items.id });
      await tx.execute(
        sql`insert into images (item_id, mime, data) select ${ni.id}, mime, data from images where item_id = ${oldId}`,
      );
    }
    return copy.id;
  });
  revalidatePath("/");
  redirect(`/lists/${newId}`);
}

export async function deleteList(listId: number) {
  await requireUser();
  await db.delete(lists).where(eq(lists.id, listId));
  revalidatePath("/");
  redirect("/");
}

// ── Sections ──

export async function createSection(listId: number, title: string) {
  await requireUser();
  const name = title.trim();
  if (!name) return;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${sections.position}), -1)` })
    .from(sections)
    .where(eq(sections.listId, listId));
  await db.insert(sections).values({ listId, title: name, position: Number(max) + 1 });
  await touchList(listId);
}

export async function renameSection(sectionId: number, title: string) {
  await requireUser();
  const name = title.trim();
  if (!name) return;
  const [s] = await db
    .update(sections)
    .set({ title: name })
    .where(eq(sections.id, sectionId))
    .returning({ listId: sections.listId });
  if (s) await touchList(s.listId);
}

export async function moveSection(sectionId: number, direction: -1 | 1) {
  await requireUser();
  const s = await db.query.sections.findFirst({ where: eq(sections.id, sectionId) });
  if (!s) return;
  const all = await db
    .select()
    .from(sections)
    .where(eq(sections.listId, s.listId))
    .orderBy(asc(sections.position), asc(sections.id));
  const from = all.findIndex((x) => x.id === sectionId);
  const to = from + direction;
  if (to < 0 || to >= all.length) return;
  [all[from], all[to]] = [all[to], all[from]];
  await db.transaction(async (tx) => {
    for (const [i, x] of all.entries()) {
      await tx.update(sections).set({ position: i }).where(eq(sections.id, x.id));
    }
  });
  await touchList(s.listId);
}

// The section's wishes stay on the list, moved to the top without a section.
export async function deleteSection(sectionId: number) {
  await requireUser();
  const [s] = await db
    .delete(sections)
    .where(eq(sections.id, sectionId))
    .returning({ listId: sections.listId });
  if (s) await touchList(s.listId);
}

// ── Items ──

export type ItemState = { error?: string; ok?: boolean };

export async function saveItem(_prev: ItemState, form: FormData): Promise<ItemState> {
  const user = await requireUser();
  const listId = Number(form.get("listId"));
  const itemId = form.get("itemId") ? Number(form.get("itemId")) : null;
  const name = clean(form.get("name"));
  if (!name) return { error: "Give the wish a name." };

  const rawUrl = clean(form.get("url"));
  const url = cleanUrl(form.get("url"));
  if (rawUrl && !url) return { error: "That link doesn't look right." };

  const sectionValue = clean(form.get("sectionId"));
  let sectionId = sectionValue ? Number(sectionValue) : null;
  if (sectionId) {
    const s = await db.query.sections.findFirst({
      where: and(eq(sections.id, sectionId), eq(sections.listId, listId)),
    });
    if (!s) sectionId = null;
  }

  const values = {
    name,
    url,
    detail: clean(form.get("detail")),
    shop: clean(form.get("shop")),
    note: clean(form.get("note")),
    sectionId,
  };

  const picture = parsePicture(form.get("picture"));
  if (picture === "invalid") return { error: "That picture couldn't be read. Try a JPEG or PNG." };
  const removePicture = form.get("removePicture") === "1";

  let savedId = itemId;
  if (itemId) {
    const existing = await db.query.items.findFirst({
      where: and(eq(items.id, itemId), eq(items.listId, listId)),
    });
    if (!existing) return { error: "That wish no longer exists." };
    // Moving to another section puts the wish at the end of it.
    const position =
      existing.sectionId === sectionId ? existing.position : await nextPosition(listId, sectionId);
    await db.update(items).set({ ...values, position }).where(eq(items.id, itemId));
  } else {
    const position = await nextPosition(listId, sectionId);
    const [created] = await db
      .insert(items)
      .values({ ...values, listId, position, createdBy: user })
      .returning({ id: items.id });
    savedId = created.id;
  }

  if (savedId && (picture || removePicture)) {
    await db.delete(images).where(eq(images.itemId, savedId));
    if (picture) await db.insert(images).values({ itemId: savedId, ...picture });
  }
  await touchList(listId);
  return { ok: true };
}

const MAX_PICTURE_BYTES = 1_500_000;

// The browser sends pictures as data URLs, already shrunk to a sensible size.
// Only JPEG and PNG are kept, because those are what the PDF can embed.
function parsePicture(value: FormDataEntryValue | null): { mime: string; data: Buffer } | null | "invalid" {
  if (typeof value !== "string" || !value) return null;
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return "invalid";
  const data = Buffer.from(match[2], "base64");
  if (data.length === 0 || data.length > MAX_PICTURE_BYTES) return "invalid";
  const jpeg = data[0] === 0xff && data[1] === 0xd8;
  const png = data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if ((match[1] === "image/jpeg" && !jpeg) || (match[1] === "image/png" && !png)) return "invalid";
  return { mime: match[1], data };
}

async function nextPosition(listId: number, sectionId: number | null) {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${items.position}), -1)` })
    .from(items)
    .where(
      and(
        eq(items.listId, listId),
        sectionId ? eq(items.sectionId, sectionId) : sql`${items.sectionId} is null`,
      ),
    );
  return Number(max) + 1;
}

export async function deleteItem(itemId: number) {
  await requireUser();
  const [it] = await db.delete(items).where(eq(items.id, itemId)).returning({ listId: items.listId });
  if (it) await touchList(it.listId);
}

// Saves the order after a drag: each group lists its item ids top to bottom.
export async function reorderItems(
  listId: number,
  groups: { sectionId: number | null; itemIds: number[] }[],
) {
  await requireUser();
  const sectionIds = groups.map((g) => g.sectionId).filter((id): id is number => id !== null);
  if (sectionIds.length) {
    const owned = await db
      .select({ id: sections.id })
      .from(sections)
      .where(and(eq(sections.listId, listId), inArray(sections.id, sectionIds)));
    if (owned.length !== new Set(sectionIds).size) return;
  }
  await db.transaction(async (tx) => {
    for (const g of groups) {
      for (const [position, id] of g.itemIds.entries()) {
        await tx
          .update(items)
          .set({ sectionId: g.sectionId, position })
          .where(and(eq(items.id, id), eq(items.listId, listId)));
      }
    }
  });
  await touchList(listId);
}
