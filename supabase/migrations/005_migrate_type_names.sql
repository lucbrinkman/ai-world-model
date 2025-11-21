-- Migration: Update node and edge type names from single letters to descriptive names
-- This migration updates all existing documents to use the new type naming convention

-- Create a function to recursively update type fields in JSONB
CREATE OR REPLACE FUNCTION migrate_node_types(data JSONB)
RETURNS JSONB AS $$
DECLARE
  updated_data JSONB;
  node JSONB;
  nodes JSONB[];
  connection JSONB;
  connections JSONB[];
  updated_node JSONB;
  updated_connection JSONB;
  i INT;
  j INT;
BEGIN
  updated_data := data;

  -- Process each node in the nodes array
  IF jsonb_typeof(data -> 'nodes') = 'array' THEN
    nodes := ARRAY[]::JSONB[];

    FOR i IN 0..(jsonb_array_length(data -> 'nodes') - 1) LOOP
      node := data -> 'nodes' -> i;
      updated_node := node;

      -- Update node type
      IF node ->> 'type' = 'n' THEN
        updated_node := jsonb_set(updated_node, '{type}', '"question"');
      ELSIF node ->> 'type' = 's' THEN
        updated_node := jsonb_set(updated_node, '{type}', '"start"');
      ELSIF node ->> 'type' = 'g' THEN
        updated_node := jsonb_set(updated_node, '{type}', '"goodOutcome"');
      ELSIF node ->> 'type' = 'a' THEN
        updated_node := jsonb_set(updated_node, '{type}', '"ambivalentOutcome"');
      ELSIF node ->> 'type' = 'e' THEN
        updated_node := jsonb_set(updated_node, '{type}', '"existentialOutcome"');
      ELSIF node ->> 'type' = 'i' THEN
        updated_node := jsonb_set(updated_node, '{type}', '"intermediateStep"');
      END IF;

      -- Process connections for this node
      IF jsonb_typeof(updated_node -> 'connections') = 'array' THEN
        connections := ARRAY[]::JSONB[];

        FOR j IN 0..(jsonb_array_length(updated_node -> 'connections') - 1) LOOP
          connection := updated_node -> 'connections' -> j;
          updated_connection := connection;

          -- Update connection type
          IF connection ->> 'type' = 'y' THEN
            updated_connection := jsonb_set(updated_connection, '{type}', '"yes"');
          ELSIF connection ->> 'type' = 'n' THEN
            updated_connection := jsonb_set(updated_connection, '{type}', '"no"');
          ELSIF connection ->> 'type' = '-' THEN
            updated_connection := jsonb_set(updated_connection, '{type}', '"always"');
          END IF;

          connections := array_append(connections, updated_connection);
        END LOOP;

        -- Replace connections array with updated one
        updated_node := jsonb_set(updated_node, '{connections}', to_jsonb(connections));
      END IF;

      nodes := array_append(nodes, updated_node);
    END LOOP;

    -- Replace nodes array with updated one
    updated_data := jsonb_set(updated_data, '{nodes}', to_jsonb(nodes));
  END IF;

  RETURN updated_data;
END;
$$ LANGUAGE plpgsql;

-- Update all existing documents
UPDATE documents
SET data = migrate_node_types(data)
WHERE
  -- Only update documents that still have old type format
  data::text LIKE '%"type":"n"%'
  OR data::text LIKE '%"type":"s"%'
  OR data::text LIKE '%"type":"g"%'
  OR data::text LIKE '%"type":"a"%'
  OR data::text LIKE '%"type":"e"%'
  OR data::text LIKE '%"type":"i"%'
  OR data::text LIKE '%"type":"y"%'
  OR data::text LIKE '%"type":"-"%';

-- Drop the migration function (no longer needed after migration)
DROP FUNCTION migrate_node_types(JSONB);

-- Add a comment to document this migration
COMMENT ON TABLE documents IS 'Document data uses descriptive type names (question, start, goodOutcome, etc.) as of migration 005';
