import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getList } from "@/lib/data";
import ListEditor from "@/components/ListEditor";

export const dynamic = "force-dynamic";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const data = await getList(Number((await params).id));
  if (!data) notFound();

  return (
    <main className="sheet">
      <div className="topbar">
        <Link href="/">← All lists</Link>
      </div>
      <ListEditor list={data.list} sections={data.sections} items={data.items} />
    </main>
  );
}
