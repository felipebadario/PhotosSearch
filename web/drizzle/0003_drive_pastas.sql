CREATE TABLE "drive_sources" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"organization_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"folder_id" text NOT NULL,
	"resource_key" text,
	"folder_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"files_seen" integer DEFAULT 0 NOT NULL,
	"files_imported" integer DEFAULT 0 NOT NULL,
	"sync_requested_at" timestamp with time zone DEFAULT now(),
	"last_synced_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_sources" ADD CONSTRAINT "drive_sources_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_sources" ADD CONSTRAINT "drive_sources_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_sources" ADD CONSTRAINT "drive_sources_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drive_sources_collection_folder_uidx" ON "drive_sources" USING btree ("collection_id","folder_id");--> statement-breakpoint
CREATE INDEX "drive_sources_org_idx" ON "drive_sources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "photos_org_external_idx" ON "photos" USING btree ("organization_id","external_ref");