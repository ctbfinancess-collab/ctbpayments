CREATE TABLE "sandbox_virtual_card_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"merchant_name" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_virtual_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"nickname" text,
	"color" text NOT NULL,
	"brand" text DEFAULT 'Visa' NOT NULL,
	"last_four" text NOT NULL,
	"pan_encrypted" text NOT NULL,
	"cvv_encrypted" text NOT NULL,
	"holder_name" text NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"limit_minor" integer NOT NULL,
	"used_minor" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandbox_virtual_card_transactions" ADD CONSTRAINT "sandbox_virtual_card_transactions_card_id_sandbox_virtual_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."sandbox_virtual_cards"("id") ON DELETE cascade ON UPDATE no action;