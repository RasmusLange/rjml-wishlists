import path from "node:path";
import { Document, Font, Image, Link, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ListWithItems } from "@/lib/data";
import { groupItems } from "@/lib/data";
import { shopFromUrl } from "@/lib/format";

const fonts = path.join(process.cwd(), "src/pdf/fonts");

Font.register({
  family: "Fraunces",
  fonts: [
    { src: path.join(fonts, "fraunces-latin-300-normal.woff"), fontWeight: 300 },
    { src: path.join(fonts, "fraunces-latin-400-normal.woff"), fontWeight: 400 },
    { src: path.join(fonts, "fraunces-latin-500-normal.woff"), fontWeight: 500 },
  ],
});
Font.register({
  family: "Plex",
  fonts: [
    { src: path.join(fonts, "ibm-plex-sans-latin-400-normal.woff"), fontWeight: 400 },
    { src: path.join(fonts, "ibm-plex-sans-latin-500-normal.woff"), fontWeight: 500 },
    { src: path.join(fonts, "ibm-plex-sans-latin-600-normal.woff"), fontWeight: 600 },
  ],
});
// Keep words whole instead of hyphenating them.
Font.registerHyphenationCallback((word) => [word]);

const c = {
  cobalt: "#1B3A6B",
  cobaltSoft: "#7189AF",
  cobaltTint: "#EAEFF6",
  ink: "#141A22",
  grey: "#78838F",
  hairline: "#DDE3E9",
};

const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 64, paddingHorizontal: 68, fontFamily: "Plex", fontSize: 10, color: c.ink },
  title: { fontFamily: "Fraunces", fontWeight: 400, fontSize: 40, letterSpacing: -0.8, lineHeight: 1.05, color: c.cobalt },
  intro: { marginTop: 12, maxWidth: 330, fontSize: 10, lineHeight: 1.6, color: c.grey },
  group: { marginTop: 30 },
  firstGroup: { marginTop: 18 },
  groupHead: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  groupTitle: { fontWeight: 600, fontSize: 7.5, letterSpacing: 1.4, textTransform: "uppercase", color: c.cobalt },
  groupLine: { flexGrow: 1, height: 0.75, marginLeft: 12, backgroundColor: c.hairline },
  item: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 0.75, borderBottomColor: c.hairline },
  last: { borderBottomWidth: 0 },
  // The whole picture sits on a white tile instead of being cropped to a square.
  thumbTile: { width: 52, height: 52, marginRight: 14, padding: 4, borderRadius: 6, borderWidth: 0.75, borderColor: c.hairline, backgroundColor: "#FFFFFF" },
  thumb: { width: 43.5, height: 43.5, objectFit: "contain" },
  main: { flexGrow: 1, flexShrink: 1, paddingRight: 16 },
  name: { fontFamily: "Fraunces", fontWeight: 400, fontSize: 13, lineHeight: 1.25, color: c.ink, textDecoration: "none" },
  detail: { marginTop: 4, fontSize: 9, lineHeight: 1.5, color: c.grey },
  shopRow: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  shop: { fontWeight: 500, fontSize: 7, letterSpacing: 1.1, textTransform: "uppercase", color: c.cobaltSoft, textDecoration: "none" },
  chip: { flexShrink: 0, maxWidth: "38%", alignSelf: "flex-start", marginTop: 1, paddingVertical: 3.5, paddingHorizontal: 8, borderRadius: 999, backgroundColor: c.cobaltTint },
  chipText: { fontWeight: 500, fontSize: 7.5, lineHeight: 1.35, color: c.cobalt, textAlign: "center" },
  empty: { marginTop: 24, fontSize: 10, color: c.grey },
  pageNumber: { position: "absolute", bottom: 32, left: 68, right: 68, fontSize: 7.5, color: c.grey, textAlign: "right" },
});

function Arrow() {
  return (
    <Svg width={6} height={6} viewBox="0 0 10 10" style={{ marginLeft: 3 }}>
      <Path d="M2 8 L8 2 M3.5 2 H8 V6.5" stroke={c.cobaltSoft} strokeWidth={1.3} fill="none" />
    </Svg>
  );
}

type Pictures = Map<number, { mime: string; data: Buffer }>;

export default function WishlistDocument({ data, pictures }: { data: ListWithItems; pictures: Pictures }) {
  const groups = groupItems(data).filter((g) => g.items.length > 0);
  return (
    <Document title={data.list.title} author={data.list.createdBy ?? undefined} creator="Wishlists">
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{data.list.title}</Text>
        {data.list.intro && <Text style={s.intro}>{data.list.intro}</Text>}

        {groups.length === 0 && <Text style={s.empty}>This list has no wishes yet.</Text>}

        {groups.map((g, gi) => (
          <View key={g.section?.id ?? "loose"} style={gi === 0 ? s.firstGroup : s.group}>
            {g.section && (
              // Keep the heading with its first wish.
              <View style={s.groupHead} minPresenceAhead={60}>
                <Text style={s.groupTitle}>{g.section.title}</Text>
                <View style={s.groupLine} />
              </View>
            )}
            {g.items.map((it, i) => {
              const shop = it.shop ?? shopFromUrl(it.url);
              const picture = pictures.get(it.id);
              return (
                <View key={it.id} style={i === g.items.length - 1 ? [s.item, s.last] : s.item} wrap={false}>
                  {picture && (
                    <View style={s.thumbTile}>
                      <Image
                        style={s.thumb}
                        src={{ data: picture.data, format: picture.mime === "image/png" ? "png" : "jpg" }}
                      />
                    </View>
                  )}
                  <View style={s.main}>
                    {it.url ? (
                      <Link src={it.url} style={s.name}>
                        {it.name}
                      </Link>
                    ) : (
                      <Text style={s.name}>{it.name}</Text>
                    )}
                    {it.detail && <Text style={s.detail}>{it.detail}</Text>}
                    {shop &&
                      (it.url ? (
                        <View style={s.shopRow}>
                          <Link src={it.url} style={s.shop}>
                            {shop}
                          </Link>
                          <Arrow />
                        </View>
                      ) : (
                        <View style={s.shopRow}>
                          <Text style={s.shop}>{shop}</Text>
                        </View>
                      ))}
                  </View>
                  {it.note && (
                    <View style={s.chip}>
                      <Text style={s.chipText}>{it.note}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <Text
          style={s.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")}
        />
      </Page>
    </Document>
  );
}
