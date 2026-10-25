import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { items, lists } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createList, logout } from "./actions";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function Home() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: lists.id,
      title: lists.title,
      createdBy: lists.createdBy,
      updatedAt: lists.updatedAt,
      count: sql<number>`count(${items.id})::int`,
    })
    .from(lists)
    .leftJoin(items, eq(items.listId, lists.id))
    .groupBy(lists.id)
    .orderBy(desc(lists.updatedAt));

  return (
    <main className="sheet">
      <div className="topbar">
        <span>Logged in as {user}</span>
        <form action={logout}>
          <button className="btn secondary" style={{ padding: "6px 12px" }}>Log out</button>
        </form>
      </div>
      <p className="eyebrow">Our wishlists</p>
      <h1>Wishlists</h1>
      <p className="lede">Collect wishes, put them in order, and export a list as a PDF when someone asks.</p>

      <form action={createList} className="new-list">
        <input className="input" name="title" placeholder="Name a new list, e.g. Christmas 2026" aria-label="New list name" />
        <button className="btn">New list</button>
      </form>

      {rows.length === 0 ? (
        <div className="empty">No lists yet. Name your first one above.</div>
      ) : (
        <div className="lists">
          {rows.map((l) => (
            <Link key={l.id} href={`/lists/${l.id}`} className="list-card">
              <div>
                <h2>{l.title}</h2>
                <p>
                  Updated {dateFormat.format(l.updatedAt)}
                  {l.createdBy ? ` · started by ${l.createdBy}` : ""}
                </p>
              </div>
              <span className="count">
                {l.count} {l.count === 1 ? "wish" : "wishes"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
