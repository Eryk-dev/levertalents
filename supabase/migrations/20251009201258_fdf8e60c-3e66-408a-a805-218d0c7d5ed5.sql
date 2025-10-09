-- Add one_on_one_id foreign key to development_plans
ALTER TABLE public.development_plans
ADD COLUMN one_on_one_id UUID REFERENCES public.one_on_ones(id) ON DELETE SET NULL;

-- Add specific PDI fields (6 questions from the script)
ALTER TABLE public.development_plans
ADD COLUMN main_objective TEXT,
ADD COLUMN committed_actions TEXT,
ADD COLUMN required_support TEXT,
ADD COLUMN success_metrics TEXT,
ADD COLUMN anticipated_challenges TEXT,
ADD COLUMN deadline DATE;

-- Add index for better query performance
CREATE INDEX idx_development_plans_one_on_one_id ON public.development_plans(one_on_one_id);
CREATE INDEX idx_development_plans_user_id_created_at ON public.development_plans(user_id, created_at DESC);

-- Add column to one_on_ones to store meeting structure
ALTER TABLE public.one_on_ones
ADD COLUMN meeting_structure JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies to allow leaders to create PDIs during 1:1s
CREATE POLICY "Leaders can create PDIs during their 1:1s"
ON public.development_plans
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'lider'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM one_on_ones o 
    WHERE o.id = development_plans.one_on_one_id 
    AND o.leader_id = auth.uid()
  )
);