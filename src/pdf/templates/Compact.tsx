import { Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { groupItems } from "@/lib/data";
import { KeepWithFirst, PageNumber, shopOf, type TemplateProps } from "../shared";

// Black and grey only, so it prints well on any printer.
const c = { ink: "#111111", grey: "#6B6B6B", light: "#BDBDBD", rule: "#DADADA" };

const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 48, paddingHorizontal: 48, fontFamily: "Plex", fontSize: 9, color: c.ink },
  title: { fontWeight: 600, fontSize: 20, letterSpacing: -0.3, color: c.ink },
  intro: { marginTop: 4, fontSize: 9, lineHeight: 1.5, color: c.grey },
  count: { marginTop: 2, fontSize: 7.5, color: c.grey },
  group: { marginTop: 16 },
  groupTitle: { paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: c.ink, fontWeight: 600, fontSize: 7.5, letterSpacing: 1.2, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: c.rule },
  box: { width: 8, height: 8, marginTop: 2, marginRight: 8, borderWidth: 0.75, borderColor: c.ink, borderRadius: 1.5 },
  // flexBasis 0 lets long text wrap instead of pushing the tag off the page.
  main: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 10 },
  line: { fontSize: 9, lineHeight: 1.4 },
  name: { fontWeight: 500, color: c.ink, textDecoration: "none" },
  detail: { color: c.grey },
  side: { flexShrink: 0, maxWidth: "40%", alignItems: "flex-end" },
  meta: { fontSize: 8, lineHeight: 1.4, color: c.grey, textAlign: "right" },
  price: { fontWeight: 600, color: c.ink },
  empty: { marginTop: 16, fontSize: 9, color: c.grey },
  pageNumber: { position: "absolute", bottom: 26, left: 48, right: 48, fontSize: 7, color: c.grey, textAlign: "right" },
});

// A dense list with tick boxes: fits many wishes on a page and prints in black and white.
export default function Compact({ data }: TemplateProps) {
  const groups = groupItems(data).filter((g) => g.items.length > 0);
  const count = data.items.length;
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.title}>{data.list.title}</Text>
      {data.list.intro && <Text style={s.intro}>{data.list.intro}</Text>}
      <Text style={s.count}>
        {count} {count === 1 ? "wish" : "wishes"}
      </Text>
      {groups.length === 0 && <Text style={s.empty}>This list has no wishes yet.</Text>}

      {groups.map((g) => (
        <View key={g.section?.id ?? "loose"} style={s.group}>
          <KeepWithFirst header={g.section && (
            <Text style={s.groupTitle}>
              {g.section.title}
            </Text>
          )}>
            {g.items.map((it) => {
              const shop = shopOf(it);
              const meta = [it.note, shop].filter(Boolean).join(" · ");
              return (
                <View key={it.id} style={s.row} wrap={false}>
                  <View style={s.box} />
                  <View style={s.main}>
                    <Text style={s.line}>
                      {it.url ? (
                        <Link src={it.url} style={s.name}>
                          {it.name}
                        </Link>
                      ) : (
                        <Text style={s.name}>{it.name}</Text>
                      )}
                      {it.detail && <Text style={s.detail}>{`  ${it.detail.replace(/\s*\n\s*/g, " ")}`}</Text>}
                    </Text>
                  </View>
                  {(meta || it.price) && (
                    <View style={s.side}>
                      <Text style={s.meta}>
                        {meta}
                        {it.price && <Text style={s.price}>{`${meta ? "   " : ""}${it.price}`}</Text>}
                      </Text>
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
