CREATE TABLE "lgpd_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lgpd_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol" text NOT NULL,
	"right" text NOT NULL,
	"channel" text NOT NULL,
	"requester_name" text NOT NULL,
	"requester_contact" text NOT NULL,
	"customer_id" uuid,
	"description" text NOT NULL,
	"identity_verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"response" text,
	"received_at" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lgpd_requests_protocol_unique" UNIQUE("protocol")
);
--> statement-breakpoint
ALTER TABLE "lgpd_request_events" ADD CONSTRAINT "lgpd_request_events_request_id_lgpd_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."lgpd_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgpd_request_events" ADD CONSTRAINT "lgpd_request_events_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgpd_requests" ADD CONSTRAINT "lgpd_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgpd_requests" ADD CONSTRAINT "lgpd_requests_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lgpd_request_events_request_idx" ON "lgpd_request_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "lgpd_requests_status_idx" ON "lgpd_requests" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "lgpd_requests_received_idx" ON "lgpd_requests" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "lgpd_requests_customer_idx" ON "lgpd_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION lgpd_request_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'lgpd_request_events é somente acréscimo (append-only)';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER lgpd_request_events_no_update_delete BEFORE UPDATE OR DELETE ON lgpd_request_events FOR EACH ROW EXECUTE FUNCTION lgpd_request_events_append_only();--> statement-breakpoint
CREATE TRIGGER lgpd_request_events_no_truncate BEFORE TRUNCATE ON lgpd_request_events FOR EACH STATEMENT EXECUTE FUNCTION lgpd_request_events_append_only();
