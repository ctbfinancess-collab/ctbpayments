CREATE TABLE "sandbox_account_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"direction" text NOT NULL,
	"description" text NOT NULL,
	"counterparty" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"status" text NOT NULL,
	"category" text NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"receipt_available" boolean DEFAULT false NOT NULL,
	"institution" text NOT NULL,
	"document" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"available_minor" integer NOT NULL,
	"ledger_minor" integer NOT NULL,
	"digital_account_minor" integer NOT NULL,
	"blocked_minor" integer NOT NULL,
	"investments_minor" integer NOT NULL,
	"card_account_minor" integer NOT NULL,
	"credit_minor" integer NOT NULL,
	"foreign_currency_minor" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandbox_account_transactions" ADD CONSTRAINT "sandbox_account_transactions_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;