"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item, List, Section } from "@/db/schema";
import {
  createSection,
  deleteItem,
  deleteList,
  deleteSection,
  duplicateList,
  moveSection,
  renameSection,
  reorderItems,
  updateList,
} from "@/app/actions";
import { shopFromUrl } from "@/lib/format";
import ItemDialog, { type DialogTarget } from "./ItemDialog";

// Drop zones are keyed "loose" (no section) or "s<id>".
type Layout = Record<string, number[]>;
const LOOSE = "loose";
const key = (sectionId: number | null) => (sectionId === null ? LOOSE : `s${sectionId}`);
const sectionIdOf = (k: string) => (k === LOOSE ? null : Number(k.slice(1)));

function buildLayout(sections: Section[], items: Item[]): Layout {
  const layout: Layout = { [LOOSE]: [] };
  for (const s of sections) layout[key(s.id)] = [];
  for (const it of items) (layout[key(it.sectionId)] ?? layout[LOOSE]).push(it.id);
  return layout;
}

export default function ListEditor({ list, sections, items }: { list: List; sections: Section[]; items: Item[] }) {
  const [title, setTitle] = useState(list.title);
  const [intro, setIntro] = useState(list.intro ?? "");
  const [layout, setLayout] = useState(() => buildLayout(sections, items));
  const [activeId, setActiveId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [newSection, setNewSection] = useState("");
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const before = useRef<Layout | null>(null);

  // Take the server's version whenever it changes (after any save).
  useEffect(() => setLayout(buildLayout(sections, items)), [sections, items]);
  useEffect(() => {
    setTitle(list.title);
    setIntro(list.intro ?? "");
  }, [list.title, list.intro]);

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function findContainer(id: UniqueIdentifier, from: Layout = layout) {
    if (typeof id === "string" && id in from) return id;
    return Object.keys(from).find((k) => from[k].includes(id as number));
  }

  function onDragStart({ active }: DragStartEvent) {
    before.current = layout;
    setActiveId(active.id as number);
  }

  // Moving across sections happens while dragging, so the gap opens in the right place.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setLayout((prev) => {
      const from = findContainer(active.id, prev);
      const to = findContainer(over.id, prev);
      if (!from || !to || from === to) return prev;
      const target = prev[to];
      let index = target.length;
      if (!(typeof over.id === "string" && over.id in prev)) {
        const translated = active.rect.current.translated;
        const below = translated && translated.top > over.rect.top + over.rect.height / 2;
        index = target.indexOf(over.id as number) + (below ? 1 : 0);
      }
      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), active.id as number, ...target.slice(index)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    let next = layout;
    const from = findContainer(active.id);
    const to = over ? findContainer(over.id) : undefined;
    if (from && to && from === to && over) {
      const oldIndex = layout[to].indexOf(active.id as number);
      const newIndex = typeof over.id === "string" ? layout[to].length - 1 : layout[to].indexOf(over.id as number);
      if (oldIndex !== newIndex && newIndex >= 0) next = { ...layout, [to]: arrayMove(layout[to], oldIndex, newIndex) };
    }
    setLayout(next);
    if (JSON.stringify(next) === JSON.stringify(before.current)) return;
    const groups = Object.entries(next).map(([k, itemIds]) => ({ sectionId: sectionIdOf(k), itemIds }));
    startTransition(() => reorderItems(list.id, groups));
  }

  function onDragCancel() {
    setActiveId(null);
    if (before.current) setLayout(before.current);
  }

  function saveHeader() {
    if (title.trim() === list.title && (intro.trim() || null) === list.intro) return;
    startTransition(() => updateList(list.id, { title, intro }));
  }

  function removeItem(item: Item) {
    if (!confirm(`Remove “${item.name}” from the list?`)) return;
    startTransition(() => deleteItem(item.id));
  }

  function removeSection(section: Section) {
    const count = layout[key(section.id)]?.length ?? 0;
    const message = count
      ? `Remove the section “${section.title}”? Its ${count} ${count === 1 ? "wish moves" : "wishes move"} to the top of the list.`
      : `Remove the section “${section.title}”?`;
    if (confirm(message)) startTransition(() => deleteSection(section.id));
  }

  const activeItem = activeId ? byId.get(activeId) : undefined;
  const totalItems = items.length;

  return (
    <>
      <div className="list-head">
        <p className="eyebrow">Wishlist</p>
        <input
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveHeader}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="List title"
        />
        <textarea
          className="intro-input"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          onBlur={saveHeader}
          rows={1}
          placeholder="Add a short intro (optional)"
          aria-label="Intro"
        />
      </div>

      <div className="actions">
        <button className="btn" onClick={() => setDialog({ sectionId: sections.at(-1)?.id ?? null })}>
          + Add wish
        </button>
        <a className="btn secondary" href={`/lists/${list.id}/pdf`} target="_blank" rel="noopener">
          Export PDF
        </a>
        <button className="btn secondary" disabled={pending} onClick={() => startTransition(() => duplicateList(list.id))}>
          Duplicate
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <Group
          id={LOOSE}
          ids={layout[LOOSE] ?? []}
          byId={byId}
          activeId={activeId}
          placeholder={
            totalItems === 0
              ? "No wishes yet. Add the first one above."
              : sections.length > 0 && activeId
                ? "Drop here to leave it outside a section"
                : null
          }
          onEdit={(item) => setDialog({ item, sectionId: item.sectionId })}
          onDelete={removeItem}
        />

        {sections.map((section, i) => (
          <Group
            key={section.id}
            id={key(section.id)}
            ids={layout[key(section.id)] ?? []}
            byId={byId}
            activeId={activeId}
            placeholder="Nothing here yet. Drag a wish in or add one."
            onEdit={(item) => setDialog({ item, sectionId: item.sectionId })}
            onDelete={removeItem}
            header={
              <h2 className="group-title">
                {editingSection === section.id ? (
                  <input
                    autoFocus
                    defaultValue={section.title}
                    aria-label="Section name"
                    onBlur={(e) => {
                      setEditingSection(null);
                      if (e.target.value.trim() && e.target.value.trim() !== section.title) {
                        startTransition(() => renameSection(section.id, e.target.value));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingSection(null);
                    }}
                  />
                ) : (
                  <span>{section.title}</span>
                )}
                <span className="line" />
                <span className="tools">
                  <button className="icon-btn" title="Add a wish here" aria-label={`Add a wish to ${section.title}`} onClick={() => setDialog({ sectionId: section.id })}>
                    +
                  </button>
                  <button className="icon-btn" title="Rename" aria-label={`Rename ${section.title}`} onClick={() => setEditingSection(section.id)}>
                    ✎
                  </button>
                  <button className="icon-btn" title="Move up" aria-label={`Move ${section.title} up`} disabled={i === 0 || pending} onClick={() => startTransition(() => moveSection(section.id, -1))}>
                    ↑
                  </button>
                  <button className="icon-btn" title="Move down" aria-label={`Move ${section.title} down`} disabled={i === sections.length - 1 || pending} onClick={() => startTransition(() => moveSection(section.id, 1))}>
                    ↓
                  </button>
                  <button className="icon-btn danger" title="Remove section" aria-label={`Remove ${section.title}`} onClick={() => removeSection(section)}>
                    ✕
                  </button>
                </span>
              </h2>
            }
          />
        ))}

        <DragOverlay>{activeItem ? <ItemView item={activeItem} overlay /> : null}</DragOverlay>
      </DndContext>

      <form
        className="add-section"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newSection.trim();
          if (!name) return;
          setNewSection("");
          startTransition(() => createSection(list.id, name));
        }}
      >
        <input
          className="input"
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          placeholder="New section, e.g. For the kitchen"
          aria-label="New section name"
        />
        <button className="btn secondary">Add section</button>
      </form>

      <div className="danger-zone">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm(`Delete “${list.title}” and all its wishes? This can't be undone.`)) {
              startTransition(() => deleteList(list.id));
            }
          }}
        >
          Delete list
        </button>
      </div>

      {dialog && (
        <ItemDialog listId={list.id} sections={sections} target={dialog} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function Group({
  id,
  ids,
  byId,
  activeId,
  header,
  placeholder,
  onEdit,
  onDelete,
}: {
  id: string;
  ids: number[];
  byId: Map<number, Item>;
  activeId: number | null;
  header?: React.ReactNode;
  placeholder: string | null;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section className={header ? "group" : "group loose"}>
      {header}
      <SortableContext id={id} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`drop-zone${isOver && activeId ? " over" : ""}`}>
          {ids.length === 0 && placeholder && <p className="placeholder">{placeholder}</p>}
          {ids.map((itemId) => {
            const item = byId.get(itemId);
            return item ? <SortableItem key={itemId} item={item} onEdit={onEdit} onDelete={onDelete} /> : null;
          })}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableItem({ item, onEdit, onDelete }: { item: Item; onEdit: (i: Item) => void; onDelete: (i: Item) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <ItemView
      item={item}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      handle={
        <button
          ref={setActivatorNodeRef}
          className="handle"
          aria-label={`Drag to reorder ${item.name}`}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
      }
      tools={
        <div className="item-tools">
          <button className="icon-btn" title="Edit" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}>
            ✎
          </button>
          <button className="icon-btn danger" title="Remove" aria-label={`Remove ${item.name}`} onClick={() => onDelete(item)}>
            ✕
          </button>
        </div>
      }
    />
  );
}

function ItemView({
  item,
  ref,
  style,
  dragging,
  overlay,
  handle,
  tools,
}: {
  item: Item;
  ref?: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
  dragging?: boolean;
  overlay?: boolean;
  handle?: React.ReactNode;
  tools?: React.ReactNode;
}) {
  const shop = item.shop ?? shopFromUrl(item.url);
  return (
    <div ref={ref} style={style} className={`item${dragging ? " dragging" : ""}${overlay ? " overlay" : ""}`}>
      {handle ?? <span className="handle">⋮⋮</span>}
      <div className="item-body">
        <div className="item-main">
          {item.url ? (
            <a className="item-name" href={item.url} target="_blank" rel="noopener noreferrer">
              {item.name}
            </a>
          ) : (
            <span className="item-name">{item.name}</span>
          )}
          {item.detail && <p className="item-detail">{item.detail}</p>}
          {shop &&
            (item.url ? (
              <a className="shop" href={item.url} target="_blank" rel="noopener noreferrer">
                {shop}
              </a>
            ) : (
              <span className="shop">{shop}</span>
            ))}
        </div>
        {item.note && <span className="chip">{item.note}</span>}
      </div>
      {tools}
    </div>
  );
}
