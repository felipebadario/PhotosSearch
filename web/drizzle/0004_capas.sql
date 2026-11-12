-- O primeiro preview das capas recebeu uma migração 0003 com timestamp posterior
-- à 0003 do Drive. Nesses bancos, o Drizzle pula o SQL do Drive ao atualizar.
DO $$
BEGIN
  IF to_regclass('public.drive_sources') IS NULL THEN
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
    ALTER TABLE "drive_sources" ADD CONSTRAINT "drive_sources_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "drive_sources" ADD CONSTRAINT "drive_sources_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "drive_sources" ADD CONSTRAINT "drive_sources_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
    CREATE UNIQUE INDEX "drive_sources_collection_folder_uidx" ON "drive_sources" USING btree ("collection_id","folder_id");
    CREATE INDEX "drive_sources_org_idx" ON "drive_sources" USING btree ("organization_id");
    CREATE INDEX "photos_org_external_idx" ON "photos" USING btree ("organization_id","external_ref");
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "covers" (
	"organization_id" text NOT NULL CONSTRAINT "covers_organization_id_organization_id_fk" REFERENCES "public"."organization"("id") ON DELETE cascade,
	"collection_id" text CONSTRAINT "covers_collection_id_collections_id_fk" REFERENCES "public"."collections"("id") ON DELETE cascade,
	"image" text NOT NULL,
	CONSTRAINT "covers_target" UNIQUE NULLS NOT DISTINCT("organization_id","collection_id")
);
