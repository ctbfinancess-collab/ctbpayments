ALTER TABLE "cms_items" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "cms_items" ADD CONSTRAINT "cms_items_slug_unique" UNIQUE("slug");