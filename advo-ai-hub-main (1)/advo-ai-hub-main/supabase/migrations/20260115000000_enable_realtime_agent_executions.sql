-- Enable Realtime for agent_executions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agent_executions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'agent_executions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_executions;
    END IF;
  END IF;
END $$;
