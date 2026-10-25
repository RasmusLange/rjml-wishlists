"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(item?.imageId ? `/images/${item.imageId}` : null);
  const [picture, setPicture] = useState("");
  const [removed, setRemoved] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function choosePicture(file: File | undefined) {
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
          <button className="btn" disabled={pending || processing}>
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
async function shrinkPicture(file: File): Promise<string> {
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
