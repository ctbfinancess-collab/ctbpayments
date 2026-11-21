CREATE TABLE "customer_status_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_status_changes" ADD CONSTRAINT "customer_status_changes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_status_changes" ADD CONSTRAINT "customer_status_changes_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_status_changes_customer_idx" ON "customer_status_changes" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "security_audit_events_staff_idx" ON "security_audit_events" USING btree ("staff_id","occurred_at");--> statement-breakpoint
CREATE INDEX "security_audit_events_event_idx" ON "security_audit_events" USING btree ("event","occurred_at");