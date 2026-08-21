CREATE TABLE "sandbox_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"device_id" text NOT NULL,
	"user" jsonb NOT NULL,
	"account" jsonb NOT NULL,
	"access_token_hash" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"rotated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sandbox_sessions_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "sandbox_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
