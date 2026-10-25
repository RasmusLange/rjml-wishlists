"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Item, Section } from "@/db/schema";
import { saveItem, type ItemState } from "@/app/actions";

export type DialogTarget = { item?: Item; sectionId: number | null };

export default function ItemDialog({
  listId,
  sections,
  target,
  onClose,
}: {
  listId: number;
  sections: Section[];
  target: DialogTarget;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ItemState, FormData>(saveItem, {});
  const item = target.item;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-labelledby="item-dialog-title"
    >
      <form action={action}>
        <h2 id="item-dialog-title">{item ? "Edit wish" : "New wish"}</h2>
        <input type="hidden" name="listId" value={listId} />
        {item && <input type="hidden" name="itemId" value={item.id} />}

        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" className="input" required autoFocus defaultValue={item?.name ?? ""} placeholder="Apple AirPods Pro 3" />
        </div>
        <div className="field">
          <label htmlFor="url">Link</label>
          <input id="url" name="url" className="input" type="text" inputMode="url" defaultValue={item?.url ?? ""} placeholder="https://…" />
          <span className="hint">Optional, but it makes the wish easy to find.</span>
        </div>
        <div className="field">
          <label htmlFor="detail">Details</label>
          <textarea id="detail" name="detail" className="textarea" rows={2} defaultValue={item?.detail ?? ""} placeholder="Colour, model, why you want it…" />
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="shop">Shop</label>
            <input id="shop" name="shop" className="input" defaultValue={item?.shop ?? ""} placeholder="Taken from the link if empty" />
          </div>
          <div className="field">
            <label htmlFor="note">Tag</label>
            <input id="note" name="note" className="input" defaultValue={item?.note ?? ""} placeholder="Size 36, 4 pcs…" />
          </div>
        </div>
        {sections.length > 0 && (
          <div className="field">
            <label htmlFor="sectionId">Section</label>
            <select id="sectionId" name="sectionId" className="select" defaultValue={target.sectionId ?? ""}>
              <option value="">No section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {state.error && <p className="error">{state.error}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn secondary" onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button className="btn" disabled={pending}>
            {pending ? "Saving…" : item ? "Save" : "Add wish"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
