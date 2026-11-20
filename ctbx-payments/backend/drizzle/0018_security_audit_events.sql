CREATE TABLE "security_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event" text NOT NULL,
	"outcome" text NOT NULL,
	"customer_id" uuid,
	"ip" text,
	"user_agent" text,
	"request_id" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE INDEX "security_audit_events_customer_idx" ON "security_audit_events" USING btree ("customer_id","occurred_at");--> statement-breakpoint
CREATE INDEX "security_audit_events_occurred_idx" ON "security_audit_events" USING btree ("occurred_at");