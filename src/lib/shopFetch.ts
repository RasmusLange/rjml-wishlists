import "server-only";
import { isIP } from "node:net";
import { extractProduct, partsFromHtml, type ProductInfo } from "./product";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
};
const MAX_PAGE_BYTES = 4_000_000;
const MAX_PICTURE_BYTES = 10_000_000;

// Only public web addresses: no localhost, bare IPs or internal names.
export function publicUrl(raw: string): URL | null {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) || !host.includes(".") || /(^|\.)(localhost|local|internal)$/i.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

async function readCapped(res: Response, max: number): Promise<Uint8Array | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// Pages aren't always UTF-8: older Central European shops often use
// windows-1250 or ISO-8859-2. Use the charset the server or page declares.
function decodeHtml(bytes: Uint8Array, contentType: string | null): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const declared =
    contentType?.match(/charset=["']?([\w.:-]+)/i)?.[1] ??
    head.match(/<meta[^>]+charset=["']?([\w.:-]+)/i)?.[1];
  if (declared) {
    try {
      return new TextDecoder(declared.toLowerCase()).decode(bytes);
    } catch {
      // Unknown label: fall back to UTF-8.
    }
  }
  return new TextDecoder().decode(bytes);
}

export type PageResult = { info: ProductInfo } | { error: string };

export async function readProductPage(url: URL): Promise<PageResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return { error: "The shop's page didn't answer. Check the link, or fill in the wish yourself." };
  }
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    return { error: "This shop doesn't let the app read its pages. Use the “Add to wishlist” bookmark on the shop's page instead." };
  }
  if (!res.ok) return { error: `The shop answered with an error (${res.status}). Check the link.` };
  const bytes = await readCapped(res, MAX_PAGE_BYTES);
  if (!bytes) return { error: "That page is too big to read." };
  const html = decodeHtml(bytes, res.headers.get("content-type"));
  const info = extractProduct(partsFromHtml(html, res.url || url.toString()));
  if (!info.name && !info.imageUrl) {
    return { error: "Couldn't find a product on that page. Try the “Add to wishlist” bookmark on the shop's page." };
  }
  return { info };
}

// Downloads a product picture and hands it back as a data URL. The browser
// then shrinks it to a JPEG, just like a picture you pick yourself.
export async function readPicture(url: URL): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!res.ok || !type.startsWith("image/") || type === "image/svg+xml") return null;
    const bytes = await readCapped(res, MAX_PICTURE_BYTES);
    if (!bytes || bytes.length === 0) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}
