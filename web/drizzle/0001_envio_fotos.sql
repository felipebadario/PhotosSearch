CREATE TYPE "public"."photo_status" AS ENUM('uploading', 'queued', 'processing', 'indexed', 'error');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "collection_photos" (
	"organization_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"photo_id" text NOT NULL,
	"album_id" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_photos_collection_id_photo_id_pk" PRIMARY KEY("collection_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"organization_id" text NOT NULL,
	"content_hash" text NOT NULL,
	"origin" text DEFAULT 'upload' NOT NULL,
	"external_ref" text,
	"storage_key" text,
	"original_name" text,
	"mime_type" text,
	"size_bytes" bigint,
	"width" integer,
	"height" integer,
	"taken_at" timestamp with time zone,
	"status" "photo_status" DEFAULT 'uploading' NOT NULL,
	"model_version" text,
	"error_message" text,
	"indexed_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"photo_limit" integer,
	"price_cents" integer,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"photo_limit" integer,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "collection_photos" ADD CONSTRAINT "collection_photos_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_photos" ADD CONSTRAINT "collection_photos_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_photos" ADD CONSTRAINT "collection_photos_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_photos" ADD CONSTRAINT "collection_photos_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_photos_org_idx" ON "collection_photos" USING btree ("organization_id","collection_id");--> statement-breakpoint
CREATE INDEX "collection_photos_photo_idx" ON "collection_photos" USING btree ("photo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photos_org_hash_uidx" ON "photos" USING btree ("organization_id","content_hash");--> statement-breakpoint
CREATE INDEX "photos_org_status_idx" ON "photos" USING btree ("organization_id","status");--> statement-breakpoint
-- Planos iniciais. Os preços são hipóteses comerciais e podem mudar direto no banco.
INSERT INTO "plans" ("id", "kind", "name", "photo_limit", "price_cents", "sort_order") VALUES
  ('trial', 'trial', 'Avaliação', 1000, 0, 0),
  ('start', 'business', 'Start', 5000, 7990, 1),
  ('pro', 'business', 'Pro', 20000, 14990, 2),
  ('business', 'business', 'Business', 50000, 29990, 3),
  ('enterprise', 'business', 'Enterprise', NULL, NULL, 4)
ON CONFLICT ("id") DO NOTHING;
