CREATE TABLE "sandbox_billing_bills" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"payer_id" text NOT NULL,
	"payer_snapshot" jsonb NOT NULL,
	"external_reference_sandbox" text NOT NULL,
	"digitable_line_sandbox" text NOT NULL,
	"barcode_sandbox" text NOT NULL,
	"status" text DEFAULT 'ISSUED' NOT NULL,
	"due_date" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"request_id" text NOT NULL,
	"idempotency_key" text,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_billing_payers" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"document_masked" text NOT NULL,
	"email_sandbox" text NOT NULL,
	"address_sandbox" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"idempotency_key" text,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandbox_virtual_cards" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "sandbox_virtual_cards" ADD COLUMN "request_hash" text;--> statement-breakpoint
ALTER TABLE "sandbox_virtual_cards" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "sandbox_billing_bills" ADD CONSTRAINT "sandbox_billing_bills_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_billing_bills" ADD CONSTRAINT "sandbox_billing_bills_payer_id_sandbox_billing_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."sandbox_billing_payers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_billing_payers" ADD CONSTRAINT "sandbox_billing_payers_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sandbox_billing_bills_account_idempotency_key" ON "sandbox_billing_bills" USING btree ("account_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sandbox_billing_payers_account_idempotency_key" ON "sandbox_billing_payers" USING btree ("account_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sandbox_virtual_cards_account_idempotency_key" ON "sandbox_virtual_cards" USING btree ("account_id","idempotency_key");