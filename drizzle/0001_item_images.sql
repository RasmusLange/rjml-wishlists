CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;