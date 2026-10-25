import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { currentUser } from "@/lib/auth";
import { getList, getListImages } from "@/lib/data";
import WishlistDocument from "@/pdf/WishlistDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fileName(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9æøåÆØÅ]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slug || "wishlist"}.pdf`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return Response.redirect(new URL("/login", request.url), 303);
  const data = await getList(Number((await params).id));
  if (!data) return new Response("Not found", { status: 404 });

  const pictures = await getListImages(data.list.id);
  const pdf = await renderToBuffer(createElement(WishlistDocument, { data, pictures }) as any);
  const name = fileName(data.list.title);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
