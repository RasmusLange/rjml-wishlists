import { eq } from "drizzle-orm";
import { db } from "@/db";
import { images } from "@/db/schema";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new Response("Not logged in", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const [image] = await db.select({ mime: images.mime, data: images.data }).from(images).where(eq(images.id, id));
  if (!image) return new Response("Not found", { status: 404 });

  // A changed picture gets a new id, so each URL's content never changes.
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
