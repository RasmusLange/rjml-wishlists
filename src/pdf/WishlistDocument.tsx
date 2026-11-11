import { Document } from "@react-pdf/renderer";
import type { TemplateId } from "@/lib/templates";
import type { TemplateProps } from "./shared";
import Classic from "./templates/Classic";
import Compact from "./templates/Compact";
import Festive from "./templates/Festive";
import Gallery from "./templates/Gallery";

const pages = { classic: Classic, gallery: Gallery, compact: Compact, festive: Festive } satisfies Record<
  TemplateId,
  (props: TemplateProps) => React.ReactElement
>;

export default function WishlistDocument({ template, ...props }: TemplateProps & { template: TemplateId }) {
  const Pages = pages[template] ?? Classic;
  return (
    <Document title={props.data.list.title} author={props.data.list.createdBy ?? undefined} creator="Wishlists">
      <Pages {...props} />
    </Document>
  );
}
