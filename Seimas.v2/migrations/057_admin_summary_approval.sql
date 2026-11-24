-- SECA-05: attribute privileged writes without recording request bodies or secrets.

CREATE TABLE admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    route TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT
);

CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_entity ON admin_audit_log (entity_type, entity_id, created_at DESC);

CREATE FUNCTION admin_audit_log_reject_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;

CREATE TRIGGER admin_audit_log_no_update_or_delete
BEFORE UPDATE OR DELETE ON admin_audit_log
FOR EACH ROW EXECUTE FUNCTION admin_audit_log_reject_mutation();

CREATE TRIGGER admin_audit_log_no_truncate
BEFORE TRUNCATE ON admin_audit_log
FOR EACH STATEMENT EXECUTE FUNCTION admin_audit_log_reject_mutation();
