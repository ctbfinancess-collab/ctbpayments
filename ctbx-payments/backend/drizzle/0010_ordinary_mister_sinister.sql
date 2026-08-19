CREATE TABLE "sandbox_validations" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandbox_validations" ADD CONSTRAINT "sandbox_validations_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_virtual_cards" ADD CONSTRAINT "sandbox_virtual_cards_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;