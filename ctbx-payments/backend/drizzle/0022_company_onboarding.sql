CREATE TABLE "company_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"uploaded_by_customer_id" uuid NOT NULL,
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
	CONSTRAINT "company_documents_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "company_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" DROP CONSTRAINT "companies_cnpj_unique";--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "status" SET DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "company_representatives" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "applicant_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "applicant_position" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "opening_date" date;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "legal_nature" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "main_activity" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "business_email" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "business_phone" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "annual_revenue_range" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "data_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_cep" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_street" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_number" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_complement" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_district" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_city" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_state" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "review_reason" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_uploaded_by_customer_id_customers_id_fk" FOREIGN KEY ("uploaded_by_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_documents_company_idx" ON "company_documents" USING btree ("company_id","kind","status");--> statement-breakpoint
CREATE INDEX "company_reviews_company_idx" ON "company_reviews" USING btree ("company_id","created_at");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_applicant_customer_id_customers_id_fk" FOREIGN KEY ("applicant_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_cnpj_idx" ON "companies" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_cnpj_approved_unique" ON "companies" USING btree ("cnpj") WHERE status = 'APPROVED';