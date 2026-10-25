"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Item, Section } from "@/db/schema";
import { fetchPicture, lookUpProduct, saveItem, type ItemState, type ProductLookup } from "@/app/actions";
import type { ProductInfo } from "@/lib/product";

export type DialogTarget = { item?: Item; sectionId: number | null };
export type ListChoice = { id: number; title: string; sections: Section[] };
export type Prefill = ProductInfo & { url?: string };

export default function ItemDialog({
  listId: initialListId,
  sections: initialSections,
  target,
  onClose,
  onSaved,
  lists,
  prefill,
}: {
  listId: number;
  sections: Section[];
  target: DialogTarget;
  onClose: () => void;
  onSaved?: (listId: number) => void;
  // When given, the dialog also lets you pick which list the wish goes on.
  lists?: ListChoice[];
  // Fields read from a shop page by the bookmarklet.
  prefill?: Prefill;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ItemState, FormData>(saveItem, {});
  const item = target.item;
  const [listId, setListId] = useState(initialListId);
  const sections = lists ? (lists.find((l) => l.id === listId)?.sections ?? []) : initialSections;
  const [lookup, setLookup] = useState<{ busy?: boolean; message?: string; error?: string }>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(item?.imageId ? `/images/${item.imageId}` : null);
  const [picture, setPicture] = useState("");
  const [removed, setRemoved] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function choosePicture(file: Blob | undefined) {
    if (!file) return;
    setPictureError(null);
    setProcessing(true);
    try {
      const dataUrl = await shrinkPicture(file);
      setPicture(dataUrl);
      setPreview(dataUrl);
      setRemoved(false);
    } catch {
      setPictureError("That picture couldn't be opened. Try a JPEG or PNG.");
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  // Fills in the fields that are still empty, so nothing you typed is lost.
  async function fill(info: Prefill, pictureDataUrl?: string | null) {
    const form = formRef.current;
    if (!form) return 0;
    let filled = 0;
    for (const key of ["url", "name", "detail", "shop", "price"] as const) {
      const field = form.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement | null;
      const value = info[key];
      if (field && value && !field.value.trim()) {
        field.value = value;
        filled++;
      }
    }
    if (pictureDataUrl && !preview) {
      await choosePicture(await (await fetch(pictureDataUrl)).blob());
      filled++;
    }
    return filled;
  }

  async function fillFromLink() {
    const link = (formRef.current?.elements.namedItem("url") as HTMLInputElement | null)?.value.trim();
    if (!link) {
      setLookup({ error: "Paste a link to the product first." });
      return;
    }
    setLookup({ busy: true });
    const result = await lookUpProduct(link).catch((): ProductLookup => ({ error: "Something went wrong reading that page." }));
    if (result.error || !result.info) {
      setLookup({ error: result.error ?? "Couldn't read that page." });
      return;
    }
    const filled = await fill(result.info, result.picture);
    setLookup({ message: filled ? "Filled in from the shop. Check it over before saving." : "Nothing new to fill in: the fields already have values." });
  }

  // Wishes sent by the bookmarklet arrive with the text already read; only the
  // picture has to be fetched.
  useEffect(() => {
    if (!prefill) return;
    let cancelled = false;
    (async () => {
      if (!prefill.imageUrl) return;
      setLookup({ busy: true });
      const picture = await fetchPicture(prefill.imageUrl).catch(() => null);
      if (cancelled) return;
      if (picture) await fill({}, picture);
      setLookup(picture ? {} : { error: "Couldn't fetch the picture. You can add one yourself." });
    })();
    return () => {
      cancelled = true;
    };
  }, [prefill]);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) (onSaved ? onSaved(listId) : onClose());
  }, [state, onClose, onSaved, listId]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-labelledby="item-dialog-title"
    >
      <form action={action} ref={formRef}>
        <h2 id="item-dialog-title">{item ? "Edit wish" : "New wish"}</h2>
        <input type="hidden" name="listId" value={listId} />
        {item && <input type="hidden" name="itemId" value={item.id} />}

        {lists && (
          <div className="field">
            <label htmlFor="listId">List</label>
            <select id="listId" className="select" value={listId} onChange={(e) => setListId(Number(e.target.value))}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="url">Link</label>
          <div className="link-row">
            <input
              id="url"
              name="url"
              className="input"
              type="text"
              inputMode="url"
              defaultValue={item?.url ?? prefill?.url ?? ""}
              placeholder="https://…"
              autoFocus={!item && !prefill}
              onPaste={(e) => {
                // A link pasted into an empty new wish fills it in straight away.
                const pasted = e.clipboardData.getData("text").trim();
                const name = formRef.current?.elements.namedItem("name") as HTMLInputElement | null;
                if (!item && /^\S+\.\S+$/.test(pasted) && !name?.value.trim()) setTimeout(fillFromLink, 0);
              }}
            />
            <button type="button" className="btn secondary" disabled={lookup.busy} onClick={fillFromLink}>
              {lookup.busy ? "Reading…" : "Fill in"}
            </button>
          </div>
          {lookup.error ? (
            <span className="error">{lookup.error}</span>
          ) : (
            <span className="hint">{lookup.message ?? "Paste a shop link and the rest fills itself in."}</span>
          )}
        </div>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" className="input" required autoFocus={!!item} defaultValue={item?.name ?? prefill?.name ?? ""} placeholder="Apple AirPods Pro 3" />
        </div>
        <div className="field">
          <label htmlFor="detail">Details</label>
          <textarea id="detail" name="detail" className="textarea" rows={2} defaultValue={item?.detail ?? prefill?.detail ?? ""} placeholder="Colour, model, why you want it…" />
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="shop">Shop</label>
            <input id="shop" name="shop" className="input" defaultValue={item?.shop ?? prefill?.shop ?? ""} placeholder="Taken from the link if empty" />
          </div>
          <div className="field">
            <label htmlFor="price">Price</label>
            <input id="price" name="price" className="input" defaultValue={item?.price ?? prefill?.price ?? ""} placeholder="349 kr." />
          </div>
        </div>
        <div className="field">
          <label htmlFor="note">Tag</label>
          <input id="note" name="note" className="input" defaultValue={item?.note ?? ""} placeholder="Size 36, 4 pcs…" />
        </div>
        <div className="field">
          <span className="label">Picture</span>
          <div className="picture-field">
            {preview ? (
              <img src={preview} alt="" className="picture-preview" />
            ) : (
              <div className="picture-preview empty" aria-hidden="true">
                No picture
              </div>
            )}
            <div className="picture-buttons">
              <button type="button" className="btn secondary" disabled={processing} onClick={() => fileInput.current?.click()}>
                {processing ? "Preparing…" : preview ? "Change picture" : "Add picture"}
              </button>
              {preview && (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    setPreview(null);
                    setPicture("");
                    setRemoved(true);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => choosePicture(e.target.files?.[0])}
            />
          </div>
          {pictureError && <p className="error">{pictureError}</p>}
          <input type="hidden" name="picture" value={picture} />
          <input type="hidden" name="removePicture" value={removed ? "1" : ""} />
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
          <button className="btn" disabled={pending || processing || lookup.busy}>
            {pending ? "Saving…" : item ? "Save" : "Add wish"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

const MAX_SIDE = 1200;

// Scales the picture down in the browser and re-encodes it as JPEG, so uploads
// stay small and the PDF can embed them. Phone photos are often 5+ MB otherwise.
async function shrinkPicture(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  // JPEG has no transparency, so give see-through pictures a white background.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
