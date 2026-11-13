CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"organization_name" text,
	"segment" text,
	"plan" text,
	"expected_photos" text,
	"message" text,
	"source" text DEFAULT 'site' NOT NULL,
	"organization_id" text,
	"user_id" text,
	"used_photos" integer,
	"photo_limit" integer,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_status_time_idx" ON "leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");