import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { lists, sections } from "@/db/schema";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AddWish from "./AddWish";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

// Where the bookmarklet lands, with what it read from the shop page.
export default async function AddPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  if (!(await currentUser())) {
    // Come back here after logging in, so the wish from the shop isn't lost.
    const query = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    );
    redirect(`/login?next=${encodeURIComponent(`/add?${query}`)}`);
  }
  const get = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };

  const [allLists, allSections] = await Promise.all([
    db.select({ id: lists.id, title: lists.title }).from(lists).orderBy(desc(lists.updatedAt)),
    db.select().from(sections).orderBy(asc(sections.position), asc(sections.id)),
  ]);

  if (allLists.length === 0) {
    return (
      <main className="sheet">
        <h1>No lists yet</h1>
        <p className="lede">
          Make a list first, then use the bookmark again. <Link href="/">Go to your lists</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="sheet">
      <div className="topbar">
        <Link href="/">← All lists</Link>
      </div>
      <AddWish
        lists={allLists.map((l) => ({ ...l, sections: allSections.filter((s) => s.listId === l.id) }))}
        prefill={{
          url: get("url"),
          name: get("name"),
          price: get("price"),
          shop: get("shop"),
          detail: get("detail"),
          imageUrl: get("imageUrl"),
        }}
      />
    </main>
  );
}
