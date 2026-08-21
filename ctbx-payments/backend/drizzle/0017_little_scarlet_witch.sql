CREATE TABLE "customer_kyc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"birth_date" date,
	"mother_name" text,
	"nationality" text,
	"personal_info_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_kyc_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD CONSTRAINT "customer_kyc_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;