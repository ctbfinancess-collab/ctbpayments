CREATE TABLE "sandbox_physical_card_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"direction" text NOT NULL,
	"merchant_name" text NOT NULL,
	"description" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"status" text NOT NULL,
	"authorization_code_masked" text NOT NULL,
	"receipt_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_physical_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"status" text NOT NULL,
	"brand" text NOT NULL,
	"last_four" text NOT NULL,
	"holder_name" text NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"available_minor" integer NOT NULL,
	"password_changed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_transport_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"status" text NOT NULL,
	"brand" text NOT NULL,
	"last_four" text NOT NULL,
	"holder_name" text NOT NULL,
	"balance_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandbox_physical_card_transactions" ADD CONSTRAINT "sandbox_physical_card_transactions_card_id_sandbox_physical_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."sandbox_physical_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_physical_cards" ADD CONSTRAINT "sandbox_physical_cards_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_transport_cards" ADD CONSTRAINT "sandbox_transport_cards_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;