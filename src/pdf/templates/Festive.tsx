import { Link, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { groupItems } from "@/lib/data";
import { Arrow, KeepWithFirst, PageNumber, Picture, shopOf, type TemplateProps } from "../shared";

const c = {
  cream: "#FBF6EE",
  berry: "#9B1B30",
  berryTint: "#F4E1E1",
  pine: "#1F4D3A",
  gold: "#B88A2E",
  ink: "#2A2320",
  grey: "#8A7F76",
  rule: "#E6DCCB",
};

const s = StyleSheet.create({
  page: { paddingTop: 70, paddingBottom: 70, paddingHorizontal: 72, fontFamily: "Plex", fontSize: 10, color: c.ink, backgroundColor: c.cream },
  // A thin gold double frame around every page.
  frameOuter: { position: "absolute", top: 22, left: 22, right: 22, bottom: 22, borderWidth: 0.8, borderColor: c.gold },
  frameInner: { position: "absolute", top: 26, left: 26, right: 26, bottom: 26, borderWidth: 0.4, borderColor: c.gold },
  head: { alignItems: "center" },
  title: { fontFamily: "Fraunces", fontWeight: 300, fontSize: 42, letterSpacing: -0.6, lineHeight: 1.05, color: c.berry, textAlign: "center" },
  intro: { marginTop: 10, maxWidth: 340, fontSize: 10, lineHeight: 1.6, color: c.grey, textAlign: "center" },
  group: { marginTop: 28 },
  firstGroup: { marginTop: 22 },
  groupHead: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  groupTitle: { marginHorizontal: 8, fontFamily: "Fraunces", fontWeight: 400, fontSize: 14, color: c.pine },
  item: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 0.6, borderBottomColor: c.rule },
  last: { borderBottomWidth: 0 },
  thumbTile: { flexShrink: 0, width: 52, height: 52, marginRight: 14, padding: 4, borderRadius: 8, borderWidth: 0.8, borderColor: c.gold, backgroundColor: "#FFFFFF" },
  thumb: { width: 42.4, height: 42.4, objectFit: "contain" },
  // flexBasis 0 lets long text wrap instead of pushing the tag off the page.
  main: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 16 },
  name: { fontFamily: "Fraunces", fontWeight: 400, fontSize: 13, lineHeight: 1.25, color: c.pine, textDecoration: "none" },
  detail: { marginTop: 4, fontSize: 9, lineHeight: 1.5, color: c.grey },
  shopRow: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  shop: { fontWeight: 500, fontSize: 7, letterSpacing: 1.1, textTransform: "uppercase", color: c.gold, textDecoration: "none" },
  price: { marginLeft: 10, fontWeight: 500, fontSize: 8, color: c.ink },
  chip: { flexShrink: 0, maxWidth: "38%", alignSelf: "flex-start", marginTop: 1, paddingVertical: 3.5, paddingHorizontal: 8, borderRadius: 999, backgroundColor: c.berryTint },
  chipText: { fontWeight: 500, fontSize: 7.5, lineHeight: 1.35, color: c.berry, textAlign: "center" },
  empty: { marginTop: 24, fontSize: 10, color: c.grey, textAlign: "center" },
  pageNumber: { position: "absolute", bottom: 36, left: 72, right: 72, fontSize: 7.5, color: c.gold, textAlign: "center" },
});

function Star({ size = 7, color = c.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={color} />
    </Svg>
  );
}

// A small sprig of holly between two gold rules, under the title.
function Garland() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
      <View style={{ width: 70, height: 0.6, backgroundColor: c.gold }} />
      <Svg width={44} height={16} viewBox="0 0 44 16" style={{ marginHorizontal: 8 }}>
        <Path d="M22 8 C16 1 9 2 4 5 C8 6 9 9 7 12 C12 12 17 11 22 8 Z" fill={c.pine} />
        <Path d="M22 8 C28 1 35 2 40 5 C36 6 35 9 37 12 C32 12 27 11 22 8 Z" fill={c.pine} />
        <Path d="M22 6 A2.4 2.4 0 1 1 21.99 6 Z" fill={c.berry} />
        <Path d="M19 9.5 A2 2 0 1 1 18.99 9.5 Z" fill={c.berry} />
        <Path d="M25 9.5 A2 2 0 1 1 24.99 9.5 Z" fill={c.berry} />
      </Svg>
      <View style={{ width: 70, height: 0.6, backgroundColor: c.gold }} />
    </View>
  );
}

// Holiday colours on cream: berry title, pine names, gold details and a framed page.
export default function Festive({ data, pictures }: TemplateProps) {
  const groups = groupItems(data).filter((g) => g.items.length > 0);
  return (
    <Page size="A4" style={s.page}>
      <View style={s.frameOuter} fixed />
      <View style={s.frameInner} fixed />

      <View style={s.head}>
        <Text style={s.title}>{data.list.title}</Text>
        <Garland />
        {data.list.intro && <Text style={s.intro}>{data.list.intro}</Text>}
      </View>

      {groups.length === 0 && <Text style={s.empty}>This list has no wishes yet.</Text>}

      {groups.map((g, gi) => (
        <View key={g.section?.id ?? "loose"} style={gi === 0 ? s.firstGroup : s.group}>
          <KeepWithFirst header={g.section && (
            <View style={s.groupHead}>
              <Star />
              <Text style={s.groupTitle}>{g.section.title}</Text>
              <Star />
            </View>
          )}>
            {g.items.map((it, i) => {
              const shop = shopOf(it);
              const picture = pictures.get(it.id);
              return (
                <View key={it.id} style={i === g.items.length - 1 ? [s.item, s.last] : s.item} wrap={false}>
                  {picture && (
                    <View style={s.thumbTile}>
                      <Picture picture={picture} style={s.thumb} />
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
                    {(shop || it.price) && (
                      <View style={s.shopRow}>
                        {shop &&
                          (it.url ? (
                            <>
                              <Link src={it.url} style={s.shop}>
                                {shop}
                              </Link>
                              <Arrow color={c.gold} />
                            </>
                          ) : (
                            <Text style={s.shop}>{shop}</Text>
                          ))}
                        {it.price && <Text style={shop ? s.price : [s.price, { marginLeft: 0 }]}>{it.price}</Text>}
                      </View>
                    )}
                  </View>
                  {it.note && (
                    <View style={s.chip}>
                      <Text style={s.chipText}>{it.note}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </KeepWithFirst>
        </View>
      ))}

      <PageNumber style={s.pageNumber} />
    </Page>
  );
}
