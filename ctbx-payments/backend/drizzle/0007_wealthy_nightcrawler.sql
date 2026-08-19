CREATE TABLE "sandbox_consigned_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"product_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"installments" integer NOT NULL,
	"status" text NOT NULL,
	"sandbox_reference" text NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_investment_simulations" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"product_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"projected_gross_minor" integer NOT NULL,
	"projected_net_minor" integer NOT NULL,
	"term_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandbox_consigned_applications" ADD CONSTRAINT "sandbox_consigned_applications_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_investment_simulations" ADD CONSTRAINT "sandbox_investment_simulations_account_id_sandbox_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."sandbox_accounts"("id") ON DELETE cascade ON UPDATE no action;