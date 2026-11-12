CREATE TABLE "faces" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"organization_id" text NOT NULL,
	"photo_id" text NOT NULL,
	"embedding" "bytea" NOT NULL,
	"bbox" jsonb NOT NULL,
	"detection_score" real,
	"model_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"organization_id" text NOT NULL,
	"collection_id" text,
	"match_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "face_count" integer;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "processing_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "faces" ADD CONSTRAINT "faces_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faces" ADD CONSTRAINT "faces_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "faces_photo_idx" ON "faces" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "faces_org_idx" ON "faces" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "search_logs_collection_time_idx" ON "search_logs" USING btree ("collection_id","created_at");