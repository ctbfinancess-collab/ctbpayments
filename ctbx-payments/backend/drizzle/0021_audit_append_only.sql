-- Trilha de auditoria protegida: o banco recusa ALTERAR ou APAGAR registros
-- de security_audit_events (só é possível acrescentar). Vale para qualquer
-- usuário da aplicação.
CREATE OR REPLACE FUNCTION security_audit_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'security_audit_events é somente acréscimo (append-only)';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS security_audit_events_no_update_delete ON security_audit_events;
--> statement-breakpoint
CREATE TRIGGER security_audit_events_no_update_delete
  BEFORE UPDATE OR DELETE ON security_audit_events
  FOR EACH ROW EXECUTE FUNCTION security_audit_events_append_only();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION security_audit_events_no_truncate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'security_audit_events é somente acréscimo (append-only)';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS security_audit_events_no_truncate ON security_audit_events;
--> statement-breakpoint
CREATE TRIGGER security_audit_events_no_truncate
  BEFORE TRUNCATE ON security_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION security_audit_events_no_truncate();
