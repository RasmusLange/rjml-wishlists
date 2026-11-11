import { Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { groupItems } from "@/lib/data";
import { Arrow, KeepWithFirst, PageNumber, Picture, shopOf, type TemplateProps } from "../shared";

const c = {
  cobalt: "#1B3A6B",
  cobaltSoft: "#7189AF",
  cobaltTint: "#EAEFF6",
  ink: "#141A22",
  grey: "#78838F",
  hairline: "#DDE3E9",
  porcelain: "#F5F7F8",
};

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 52, fontFamily: "Plex", fontSize: 9, color: c.ink, backgroundColor: c.porcelain },
  title: { fontFamily: "Fraunces", fontWeight: 400, fontSize: 36, letterSpacing: -0.7, lineHeight: 1.05, color: c.cobalt },
  intro: { marginTop: 10, maxWidth: 360, fontSize: 9.5, lineHeight: 1.6, color: c.grey },
  group: { marginTop: 26 },
  groupHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  groupTitle: { fontWeight: 600, fontSize: 7.5, letterSpacing: 1.4, textTransform: "uppercase", color: c.cobalt },
  groupLine: { flexGrow: 1, height: 0.75, marginLeft: 12, backgroundColor: c.hairline },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "stretch", marginBottom: 14 },
  card: { width: "48.6%", borderRadius: 8, borderWidth: 0.75, borderColor: c.hairline, backgroundColor: "#FFFFFF" },
  picture: { height: 130, padding: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomWidth: 0.75, borderBottomColor: c.hairline, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%", objectFit: "contain" },
  // Wishes without a picture get their initial on a tinted block, so the grid stays even.
  noPicture: { backgroundColor: c.cobaltTint },
  initial: { fontFamily: "Fraunces", fontWeight: 300, fontSize: 44, color: c.cobaltSoft },
  body: { padding: 12 },
  name: { fontFamily: "Fraunces", fontWeight: 400, fontSize: 12, lineHeight: 1.25, color: c.ink, textDecoration: "none" },
  detail: { marginTop: 4, fontSize: 8.5, lineHeight: 1.45, color: c.grey },
  footer: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shopRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  shop: { fontWeight: 500, fontSize: 6.5, letterSpacing: 1, textTransform: "uppercase", color: c.cobaltSoft, textDecoration: "none" },
  price: { fontWeight: 600, fontSize: 8.5, color: c.ink },
  chip: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 999, backgroundColor: c.cobaltTint },
  chipText: { fontWeight: 500, fontSize: 7, lineHeight: 1.35, color: c.cobalt },
  empty: { marginTop: 24, fontSize: 10, color: c.grey },
  pageNumber: { position: "absolute", bottom: 28, left: 52, right: 52, fontSize: 7.5, color: c.grey, textAlign: "right" },
});

// Two columns of cards, each led by its picture.
export default function Gallery({ data, pictures }: TemplateProps) {
  const groups = groupItems(data).filter((g) => g.items.length > 0);
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.title}>{data.list.title}</Text>
      {data.list.intro && <Text style={s.intro}>{data.list.intro}</Text>}
      {groups.length === 0 && <Text style={s.empty}>This list has no wishes yet.</Text>}

      {groups.map((g) => (
        <View key={g.section?.id ?? "loose"} style={s.group}>
          <KeepWithFirst header={g.section && (
            <View style={s.groupHead}>
              <Text style={s.groupTitle}>{g.section.title}</Text>
              <View style={s.groupLine} />
            </View>
          )}>
            {pairs(g.items).map((row) => (
              <View key={row[0].id} style={s.row} wrap={false}>
                {row.map((it) => (
                  <Card key={it.id} it={it} pictures={pictures} />
                ))}
              </View>
            ))}
          </KeepWithFirst>
        </View>
      ))}

      <PageNumber style={s.pageNumber} />
    </Page>
  );
}

type CardItem = TemplateProps["data"]["items"][number];

// Cards go two to a row, and a row never splits across pages.
function pairs<T>(list: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return rows;
}

function Card({ it, pictures }: { it: CardItem; pictures: TemplateProps["pictures"] }) {
  const shop = shopOf(it);
  const picture = pictures.get(it.id);
  return (
    <View style={s.card}>
      <View style={picture ? s.picture : [s.picture, s.noPicture]}>
        {picture ? (
          <Picture picture={picture} style={s.image} />
        ) : (
          <Text style={s.initial}>{it.name.trim().charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={s.body}>
        {it.url ? (
          <Link src={it.url} style={s.name}>
            {it.name}
          </Link>
        ) : (
          <Text style={s.name}>{it.name}</Text>
        )}
        {it.detail && <Text style={s.detail}>{it.detail}</Text>}
        {(shop || it.price) && (
          <View style={s.footer}>
            <View style={s.shopRow}>
              {shop &&
                (it.url ? (
                  <>
                    <Link src={it.url} style={s.shop}>
                      {shop}
                    </Link>
                    <Arrow color={c.cobaltSoft} />
                  </>
                ) : (
                  <Text style={s.shop}>{shop}</Text>
                ))}
            </View>
            {it.price && <Text style={s.price}>{it.price}</Text>}
          </View>
        )}
        {it.note && (
          <View style={s.chip}>
            <Text style={s.chipText}>{it.note}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
