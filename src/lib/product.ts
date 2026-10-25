// Reads a product's name, picture, price, shop and a short description from
// the bits of a shop page that describe it: schema.org JSON-LD first, then
// Open Graph and other meta tags, then the page title.

export type PageParts = {
  url: string;
  title: string;
  jsonLd: string[];
  // [property/name/itemprop, content] for every meta tag that has both.
  meta: [string, string][];
};

export type ProductInfo = {
  name?: string;
  imageUrl?: string;
  price?: string;
  shop?: string;
  detail?: string;
};

// The bookmarklet runs this same function inside the shop's page, as the text
// of the function, so it must not use anything from outside its own body.
export function extractProduct(parts: PageParts): ProductInfo {
  function decode(s: string): string {
    return s
      .replace(/<[^>]*>/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&(amp|lt|gt|quot|apos|nbsp|aelig|oslash|aring|AElig|Oslash|Aring|ndash|mdash|hellip|rsquo);/g, (_, n: string) => {
        const map: Record<string, string> = {
          amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
          aelig: "æ", oslash: "ø", aring: "å", AElig: "Æ", Oslash: "Ø", Aring: "Å",
          ndash: "–", mdash: "—", hellip: "…", rsquo: "’",
        };
        return map[n];
      })
      .replace(/\s+/g, " ")
      .trim();
  }

  function text(v: unknown): string | undefined {
    if (typeof v === "number") return String(v);
    if (typeof v !== "string") return undefined;
    const s = decode(v);
    return s || undefined;
  }

  function isType(node: Record<string, unknown>, ...types: string[]) {
    const t = node["@type"];
    const list = Array.isArray(t) ? t : [t];
    return list.some((x) => typeof x === "string" && types.includes(x.replace(/^.*[/#]/, "")));
  }

  // Finds the first Product (or ProductGroup) anywhere in the JSON-LD blocks.
  function findProduct(): Record<string, unknown> | undefined {
    const seen: unknown[] = [];
    for (const raw of parts.jsonLd) {
      try {
        seen.push(JSON.parse(raw.trim().replace(/^<!--|-->$/g, "")));
      } catch {
        // Some shops ship broken JSON-LD; skip it.
      }
    }
    let steps = 0;
    while (seen.length && steps++ < 5000) {
      const node = seen.shift();
      if (Array.isArray(node)) seen.push(...node);
      else if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        if (isType(obj, "Product", "ProductGroup", "IndividualProduct")) return obj;
        seen.push(...Object.values(obj).filter((v) => v && typeof v === "object"));
      }
    }
    return undefined;
  }

  function first<T>(v: T | T[] | undefined): T | undefined {
    return Array.isArray(v) ? v[0] : v;
  }

  function imageOf(v: unknown): string | undefined {
    const img = first(v as unknown);
    if (typeof img === "string") return img;
    if (img && typeof img === "object") {
      const o = img as Record<string, unknown>;
      return text(o.contentUrl) ?? text(o.url);
    }
    return undefined;
  }

  function offerOf(product: Record<string, unknown>): { amount?: string; currency?: string } {
    let offers = first(product.offers as unknown);
    if (!offers && product.hasVariant) {
      const variant = first(product.hasVariant as unknown) as Record<string, unknown> | undefined;
      offers = variant ? first(variant.offers as unknown) : undefined;
    }
    if (!offers || typeof offers !== "object") return {};
    const o = offers as Record<string, unknown>;
    const spec = first(o.priceSpecification as unknown) as Record<string, unknown> | undefined;
    return {
      amount: text(o.price) ?? text(o.lowPrice) ?? (spec ? text(spec.price) : undefined),
      currency: text(o.priceCurrency) ?? (spec ? text(spec.priceCurrency) : undefined),
    };
  }

  // "1995.00" + "DKK" → "1.995 kr."; anything we can't read is kept as written.
  function formatPrice(amount: string | undefined, currency: string | undefined): string | undefined {
    if (!amount) return undefined;
    let n = amount.replace(/[^\d.,]/g, "");
    if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", ".");
    else n = n.replace(/,/g, "");
    const value = Number(n);
    if (!n || !Number.isFinite(value) || value <= 0) return undefined;
    const whole = Number.isInteger(value);
    try {
      if (currency && /^[A-Z]{3}$/.test(currency)) {
        return new Intl.NumberFormat("da-DK", {
          style: "currency",
          currency,
          minimumFractionDigits: whole ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(value);
      }
    } catch {
      // Unknown currency code; fall through to the plain number.
    }
    return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 }).format(value);
  }

  // The first sentence or so, enough for the detail line on the list.
  function shorten(s: string | undefined): string | undefined {
    if (!s) return undefined;
    const sentence = /^.{20,}?[.!?](\s|$)/.exec(s)?.[0].trim() ?? s;
    if (sentence.length <= 160) return sentence;
    const cut = sentence.slice(0, 157);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 100))}…`;
  }

  const meta = new Map<string, string>();
  for (const [key, value] of parts.meta) {
    const k = key.toLowerCase();
    const v = text(value);
    if (v && !meta.has(k)) meta.set(k, v);
  }

  const product = findProduct();
  const offer = product ? offerOf(product) : {};
  const shop = meta.get("og:site_name");

  let name = (product && text(product.name)) ?? meta.get("og:title") ?? meta.get("twitter:title") ?? text(parts.title);
  if (name) {
    // "Køb X fra Brand | Imerco" → "X fra Brand"
    name = name.replace(/^køb\s+/i, "");
    const host = parts.url.replace(/^https?:\/\/(www\.)?/i, "").split(/[./]/)[0].toLowerCase();
    const brand = (shop ?? host).toLowerCase().replace(/\.\w+$/, "");
    const m = /^(.+?)\s+[|–—-]\s+([^|–—-]+)$/.exec(name);
    if (m && (m[2].toLowerCase().includes(brand) || m[2].toLowerCase().includes(host))) name = m[1];
  }

  const image =
    (product && imageOf(product.image)) ??
    meta.get("og:image:secure_url") ??
    meta.get("og:image") ??
    meta.get("twitter:image") ??
    meta.get("image");
  let imageUrl: string | undefined;
  try {
    imageUrl = image ? new URL(image, parts.url).toString() : undefined;
  } catch {
    imageUrl = undefined;
  }

  const price = formatPrice(
    offer.amount ?? meta.get("product:price:amount") ?? meta.get("og:price:amount") ?? meta.get("price"),
    offer.currency ?? meta.get("product:price:currency") ?? meta.get("og:price:currency") ?? meta.get("pricecurrency"),
  );

  const detail = shorten(
    (product && text(product.description)) ?? meta.get("og:description") ?? meta.get("description"),
  );

  return {
    name: name || undefined,
    imageUrl,
    price,
    shop: shop && !/^https?:/i.test(shop) ? shop : undefined,
    detail: detail && detail !== name ? detail : undefined,
  };
}

// Pulls the parts out of raw HTML, for pages fetched on the server.
export function partsFromHtml(html: string, url: string): PageParts {
  const jsonLd = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1],
  );
  const meta: [string, string][] = [];
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map<string, string>();
    for (const m of tag.matchAll(/([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? "");
    }
    const key = attrs.get("property") ?? attrs.get("name") ?? attrs.get("itemprop");
    const content = attrs.get("content");
    if (key && content) meta.push([key, content]);
  }
  // Prices marked up as <span itemprop="price" content="349.00">.
  for (const m of html.matchAll(/<[a-z]+\b[^>]*itemprop\s*=\s*["'](price|priceCurrency)["'][^>]*content\s*=\s*["']([^"']+)["']/gi)) {
    meta.push([m[1], m[2]]);
  }
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  return { url, title, jsonLd, meta };
}
