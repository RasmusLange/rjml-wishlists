import path from "node:path";
import { Children } from "react";
import { Font, Image, Path, Svg, Text, View, type Styles } from "@react-pdf/renderer";
import type { Item } from "@/db/schema";
import type { ListWithItems } from "@/lib/data";
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

export type Pictures = Map<number, { mime: string; data: Buffer }>;
export type TemplateProps = { data: ListWithItems; pictures: Pictures };

export const shopOf = (item: Item) => item.shop ?? shopFromUrl(item.url);

export function Picture({ picture, style }: { picture: { mime: string; data: Buffer }; style: Styles[string] }) {
  return <Image style={style} src={{ data: picture.data, format: picture.mime === "image/png" ? "png" : "jpg" }} />;
}

export function Arrow({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10" style={{ marginLeft: 3 }}>
      <Path d="M2 8 L8 2 M3.5 2 H8 V6.5" stroke={color} strokeWidth={1.3} fill="none" />
    </Svg>
  );
}

// "2 / 3" in the corner, only when the list runs over more than one page.
export function PageNumber({ style }: { style: Styles[string] }) {
  return (
    <Text
      style={style}
      fixed
      render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")}
    />
  );
}

// Keeps a section heading on the same page as its first wish, so a heading is
// never left alone at the bottom of a page.
export function KeepWithFirst({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const [first, ...rest] = Children.toArray(children);
  return (
    <>
      {header ? (
        <View wrap={false}>
          {header}
          {first}
        </View>
      ) : (
        first
      )}
      {rest}
    </>
  );
}
