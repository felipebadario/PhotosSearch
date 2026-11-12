CREATE TABLE "covers" (
	"organization_id" text NOT NULL,
	"collection_id" text,
	"image" text NOT NULL,
	CONSTRAINT "covers_target" UNIQUE NULLS NOT DISTINCT("organization_id","collection_id")
);
--> statement-breakpoint
ALTER TABLE "covers" ADD CONSTRAINT "covers_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covers" ADD CONSTRAINT "covers_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;