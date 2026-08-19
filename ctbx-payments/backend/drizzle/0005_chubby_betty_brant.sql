CREATE TABLE "sandbox_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"account_transaction_id" text,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_pix_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"type" text NOT NULL,
	"key_masked" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandbox_operations" ADD CONSTRAINT "sandbox_operations_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_operations" ADD CONSTRAINT "sandbox_operations_account_transaction_id_sandbox_account_transactions_id_fk" FOREIGN KEY ("account_transaction_id") REFERENCES "public"."sandbox_account_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_pix_keys" ADD CONSTRAINT "sandbox_pix_keys_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;