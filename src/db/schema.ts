import { customType, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  intro: text("intro"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A list is split into optional sections ("For everyday", "For the table", ...).
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  listId: integer("list_id")
    .notNull()
    .references(() => lists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
});

// Only the name is required. Items without a section sit at the top of the list.
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id")
    .notNull()
    .references(() => lists.id, { onDelete: "cascade" }),
  sectionId: integer("section_id").references(() => sections.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  url: text("url"),
  detail: text("detail"),
  shop: text("shop"),
  price: text("price"),
  note: text("note"),
  position: integer("position").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One picture per wish, kept apart from items so lists load without the image bytes.
// Replacing a picture inserts a new row, so its id doubles as a cache key.
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .unique()
    .references(() => items.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type List = typeof lists.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Item = typeof items.$inferSelect & { imageId: number | null };
