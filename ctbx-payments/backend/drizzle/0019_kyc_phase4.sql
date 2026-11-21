CREATE TABLE "customer_kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"key_id" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replaced_at" timestamp with time zone,
	CONSTRAINT "customer_kyc_documents_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_cep" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_street" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_number" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_complement" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_district" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_city" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_state" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "address_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "is_pep" boolean;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "occupation" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "income_range" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "declarations_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "id_document_type" text;--> statement-breakpoint
ALTER TABLE "customer_kyc" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_kyc_documents" ADD CONSTRAINT "customer_kyc_documents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_kyc_documents_customer_idx" ON "customer_kyc_documents" USING btree ("customer_id","kind","status");