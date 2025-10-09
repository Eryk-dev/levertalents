-- Add additional fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create evaluations table
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluated_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  overall_score NUMERIC(3,2) CHECK (overall_score >= 0 AND overall_score <= 5),
  technical_score NUMERIC(3,2) CHECK (technical_score >= 0 AND technical_score <= 5),
  behavioral_score NUMERIC(3,2) CHECK (behavioral_score >= 0 AND behavioral_score <= 5),
  leadership_score NUMERIC(3,2) CHECK (leadership_score >= 0 AND leadership_score <= 5),
  comments TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'reviewed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evaluations"
  ON public.evaluations FOR SELECT
  USING (auth.uid() = evaluated_user_id);

CREATE POLICY "Leaders can view evaluations of their team"
  ON public.evaluations FOR SELECT
  USING (
    has_role(auth.uid(), 'lider'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = evaluations.evaluated_user_id
      AND tm.leader_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can create evaluations for their team"
  ON public.evaluations FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'lider'::app_role) AND
    auth.uid() = evaluator_user_id AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = evaluated_user_id
      AND tm.leader_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can update their own evaluations"
  ON public.evaluations FOR UPDATE
  USING (auth.uid() = evaluator_user_id);

CREATE POLICY "RH and Socio can view all evaluations"
  ON public.evaluations FOR SELECT
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create one_on_ones table
CREATE TABLE IF NOT EXISTS public.one_on_ones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  agenda TEXT,
  notes TEXT,
  leader_feedback TEXT,
  collaborator_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.one_on_ones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own 1:1s"
  ON public.one_on_ones FOR SELECT
  USING (auth.uid() = leader_id OR auth.uid() = collaborator_id);

CREATE POLICY "Leaders can create 1:1s for their team"
  ON public.one_on_ones FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'lider'::app_role) AND
    auth.uid() = leader_id AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = collaborator_id
      AND tm.leader_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update 1:1s"
  ON public.one_on_ones FOR UPDATE
  USING (auth.uid() = leader_id OR auth.uid() = collaborator_id);

CREATE POLICY "RH and Socio can view all 1:1s"
  ON public.one_on_ones FOR SELECT
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create one_on_one_action_items table
CREATE TABLE IF NOT EXISTS public.one_on_one_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  one_on_one_id UUID NOT NULL REFERENCES public.one_on_ones(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.one_on_one_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view action items assigned to them or from their 1:1s"
  ON public.one_on_one_action_items FOR SELECT
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.one_on_ones o
      WHERE o.id = one_on_one_action_items.one_on_one_id
      AND (o.leader_id = auth.uid() OR o.collaborator_id = auth.uid())
    )
  );

CREATE POLICY "Leaders can create action items for their 1:1s"
  ON public.one_on_one_action_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.one_on_ones o
      WHERE o.id = one_on_one_id
      AND o.leader_id = auth.uid()
    )
  );

CREATE POLICY "Assigned users can update their action items"
  ON public.one_on_one_action_items FOR UPDATE
  USING (auth.uid() = assigned_to);

CREATE POLICY "RH and Socio can view all action items"
  ON public.one_on_one_action_items FOR SELECT
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create climate_surveys table
CREATE TABLE IF NOT EXISTS public.climate_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.climate_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active surveys"
  ON public.climate_surveys FOR SELECT
  USING (status = 'active' OR has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

CREATE POLICY "RH and Socio can manage surveys"
  ON public.climate_surveys FOR ALL
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role))
  WITH CHECK (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create climate_questions table
CREATE TABLE IF NOT EXISTS public.climate_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.climate_surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.climate_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view questions from active surveys"
  ON public.climate_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.climate_surveys cs
      WHERE cs.id = survey_id
      AND (cs.status = 'active' OR has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role))
    )
  );

CREATE POLICY "RH and Socio can manage questions"
  ON public.climate_questions FOR ALL
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role))
  WITH CHECK (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create climate_responses table
CREATE TABLE IF NOT EXISTS public.climate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.climate_surveys(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.climate_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(survey_id, question_id, user_id)
);

ALTER TABLE public.climate_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own responses"
  ON public.climate_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own responses"
  ON public.climate_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
  ON public.climate_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "RH and Socio can view all responses"
  ON public.climate_responses FOR SELECT
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create development_plans table
CREATE TABLE IF NOT EXISTS public.development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  development_area TEXT NOT NULL,
  goals TEXT NOT NULL,
  action_items TEXT NOT NULL,
  timeline TEXT,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.development_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PDIs"
  ON public.development_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own PDIs"
  ON public.development_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDIs"
  ON public.development_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Leaders can view PDIs of their team"
  ON public.development_plans FOR SELECT
  USING (
    has_role(auth.uid(), 'lider'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = development_plans.user_id
      AND tm.leader_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can update PDIs of their team (approval)"
  ON public.development_plans FOR UPDATE
  USING (
    has_role(auth.uid(), 'lider'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = development_plans.user_id
      AND tm.leader_id = auth.uid()
    )
  );

CREATE POLICY "RH and Socio can view all PDIs"
  ON public.development_plans FOR SELECT
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create development_plan_updates table
CREATE TABLE IF NOT EXISTS public.development_plan_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.development_plans(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  progress_change INTEGER,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.development_plan_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates for their PDIs"
  ON public.development_plan_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.development_plans dp
      WHERE dp.id = plan_id
      AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create updates for their PDIs"
  ON public.development_plan_updates FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.development_plans dp
      WHERE dp.id = plan_id
      AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can view updates for their team PDIs"
  ON public.development_plan_updates FOR SELECT
  USING (
    has_role(auth.uid(), 'lider'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.development_plans dp
      JOIN public.team_members tm ON tm.user_id = dp.user_id
      WHERE dp.id = plan_id
      AND tm.leader_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can create updates for their team PDIs"
  ON public.development_plan_updates FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'lider'::app_role) AND
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.development_plans dp
      JOIN public.team_members tm ON tm.user_id = dp.user_id
      WHERE dp.id = plan_id
      AND tm.leader_id = auth.uid()
    )
  );

CREATE POLICY "RH and Socio can view all updates"
  ON public.development_plan_updates FOR SELECT
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create pending_tasks table
CREATE TABLE IF NOT EXISTS public.pending_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('evaluation', 'one_on_one', 'climate_survey', 'pdi_approval', 'pdi_update', 'action_item', 'other')),
  related_id UUID,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pending_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON public.pending_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.pending_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create tasks for users"
  ON public.pending_tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "RH and Socio can view all tasks"
  ON public.pending_tasks FOR SELECT
  USING (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_one_on_ones_updated_at BEFORE UPDATE ON public.one_on_ones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_one_on_one_action_items_updated_at BEFORE UPDATE ON public.one_on_one_action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climate_surveys_updated_at BEFORE UPDATE ON public.climate_surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_development_plans_updated_at BEFORE UPDATE ON public.development_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_tasks_updated_at BEFORE UPDATE ON public.pending_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();