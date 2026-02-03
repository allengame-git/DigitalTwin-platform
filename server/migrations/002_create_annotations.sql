-- Migration: 002_create_annotations
-- Description: Create annotations table for reviewer comments
-- Created: 2026-02-02

CREATE TYPE annotation_type AS ENUM ('text', 'arrow', 'region');

CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL,
    type annotation_type NOT NULL,
    content TEXT NOT NULL,
    
    -- 3D position
    position_x DOUBLE PRECISION NOT NULL,
    position_y DOUBLE PRECISION NOT NULL,
    position_z DOUBLE PRECISION NOT NULL,
    
    -- Camera state when annotation was created
    camera_position_x DOUBLE PRECISION NOT NULL,
    camera_position_y DOUBLE PRECISION NOT NULL,
    camera_position_z DOUBLE PRECISION NOT NULL,
    camera_heading DOUBLE PRECISION NOT NULL,
    camera_pitch DOUBLE PRECISION NOT NULL,
    camera_roll DOUBLE PRECISION NOT NULL,
    
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for project queries
CREATE INDEX idx_annotations_project ON annotations(project_id);

-- Index for user queries
CREATE INDEX idx_annotations_user ON annotations(user_id);

-- Index for unresolved annotations
CREATE INDEX idx_annotations_unresolved ON annotations(project_id) WHERE is_resolved = FALSE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_annotations_updated_at
    BEFORE UPDATE ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_annotations_updated_at();

COMMENT ON TABLE annotations IS 'Review annotations on 3D scene';
COMMENT ON COLUMN annotations.camera_position_x IS 'Camera X position when annotation was created';
