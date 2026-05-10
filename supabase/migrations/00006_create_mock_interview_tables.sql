
-- 面试会话表
CREATE TABLE mock_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction text NOT NULL,           -- 面试方向：前端/后端/算法等
  difficulty text NOT NULL DEFAULT 'intermediate', -- junior/intermediate/senior
  status text NOT NULL DEFAULT 'active', -- active/completed/aborted
  total_questions int NOT NULL DEFAULT 5,
  current_question int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 面试对话消息表
CREATE TABLE mock_interview_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('interviewer', 'user', 'system')),
  content text NOT NULL,
  question_index int,    -- 属于第几道题（0-based）
  follow_up_round int DEFAULT 0, -- 该题第几轮追问（0=主问题，1/2=追问）
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 面试评估报告表
CREATE TABLE mock_interview_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_score int NOT NULL DEFAULT 0,  -- 0-100
  radar_data jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{subject,value}]
  question_reviews jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{question,pros,cons,score}]
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{dimension,advice,resources}]
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 开启 RLS
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interview_reports ENABLE ROW LEVEL SECURITY;

-- mock_interviews 策略：用户只能操作自己的记录
CREATE POLICY "用户可查看自己的面试" ON mock_interviews
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "用户可创建面试" ON mock_interviews
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "用户可更新自己的面试" ON mock_interviews
  FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- mock_interview_messages 策略：通过面试 id 关联鉴权
CREATE FUNCTION can_access_interview(iid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM mock_interviews WHERE id = iid AND profile_id = auth.uid());
$$;

CREATE POLICY "用户可查看自己面试的消息" ON mock_interview_messages
  FOR SELECT TO authenticated USING (can_access_interview(interview_id));

CREATE POLICY "用户可插入自己面试的消息" ON mock_interview_messages
  FOR INSERT TO authenticated WITH CHECK (can_access_interview(interview_id));

-- mock_interview_reports 策略
CREATE POLICY "用户可查看自己的报告" ON mock_interview_reports
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "用户可创建自己的报告" ON mock_interview_reports
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mock_interview_messages;
