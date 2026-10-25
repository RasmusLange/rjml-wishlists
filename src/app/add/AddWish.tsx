"use client";

import { useRouter } from "next/navigation";
import ItemDialog, { type ListChoice, type Prefill } from "@/components/ItemDialog";

export default function AddWish({ lists, prefill }: { lists: ListChoice[]; prefill: Prefill }) {
  const router = useRouter();
  return (
    <ItemDialog
      listId={lists[0].id}
      sections={lists[0].sections}
      lists={lists}
      target={{ sectionId: null }}
      prefill={prefill}
      onClose={() => router.push("/")}
      onSaved={(listId) => router.push(`/lists/${listId}`)}
    />
  );
}
