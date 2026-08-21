ALTER TABLE "sandbox_consigned_applications" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "sandbox_consigned_applications" ADD COLUMN "request_hash" text;--> statement-breakpoint
ALTER TABLE "sandbox_operations" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sandbox_consigned_applications_account_idempotency_key" ON "sandbox_consigned_applications" USING btree ("account_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sandbox_operations_account_kind_idempotency_key" ON "sandbox_operations" USING btree ("account_id","kind","idempotency_key");