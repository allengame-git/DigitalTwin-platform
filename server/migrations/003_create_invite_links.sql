-- Migration: 003_create_invite_links
-- Description: Create invite_links table for reviewer invitations
-- Created: 2026-02-02

CREATE TABLE invite_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) UNIQUE NOT NULL,
    target_role user_role NOT NULL DEFAULT 'reviewer',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    CONSTRAINT invite_links_target_role_check CHECK (target_role = 'reviewer')
);

-- Index for token lookup
CREATE UNIQUE INDEX idx_invite_links_token ON invite_links(token);

-- Index for finding unused/valid links
CREATE INDEX idx_invite_links_valid ON invite_links(expires_at) 
    WHERE used_by IS NULL;

-- Sessions table for tracking refresh tokens
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(512) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Index for refresh token lookup
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token) WHERE is_revoked = FALSE;

-- Index for user sessions
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE is_revoked = FALSE;

-- Cleanup expired sessions (can be run as scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < NOW() OR is_revoked = TRUE;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE invite_links IS 'Invite links for reviewer access';
COMMENT ON TABLE sessions IS 'Active user sessions and refresh tokens';
