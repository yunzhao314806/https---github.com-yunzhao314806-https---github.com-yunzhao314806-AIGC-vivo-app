
-- 开启RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Helper函数
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = uid AND p.role = role_name::user_role
  );
$$;

CREATE OR REPLACE FUNCTION get_user_type(uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT user_type::text FROM profiles WHERE id = uid;
$$;

-- profiles策略
CREATE POLICY "管理员可完全访问profiles" ON profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "用户可查看自己的profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "用户可更新自己的profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));
CREATE POLICY "所有认证用户可查看公开profile" ON profiles FOR SELECT TO authenticated USING (true);

-- enterprise_profiles策略
CREATE POLICY "企业可管理自己的企业信息" ON enterprise_profiles FOR ALL TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "所有认证用户可查看企业信息" ON enterprise_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "管理员可完全访问企业信息" ON enterprise_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- resumes策略
CREATE POLICY "用户可管理自己的简历" ON resumes FOR ALL TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "企业可查看申请者简历" ON resumes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.resume_id = resumes.id AND j.enterprise_id = auth.uid())
);
CREATE POLICY "管理员可查看所有简历" ON resumes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- capability_data策略
CREATE POLICY "用户可管理自己的能力数据" ON capability_data FOR ALL TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "企业可查看候选人能力数据" ON capability_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "管理员可查看所有能力数据" ON capability_data FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- jobs策略
CREATE POLICY "企业可管理自己的职位" ON jobs FOR ALL TO authenticated USING (enterprise_id = auth.uid());
CREATE POLICY "所有人可查看活跃职位" ON jobs FOR SELECT TO authenticated USING (status = 'active');
CREATE POLICY "管理员可完全访问职位" ON jobs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- applications策略
CREATE POLICY "求职者可管理自己的申请" ON applications FOR ALL TO authenticated USING (applicant_id = auth.uid());
CREATE POLICY "企业可查看自己职位的申请" ON applications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.enterprise_id = auth.uid())
);
CREATE POLICY "企业可更新申请状态" ON applications FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.enterprise_id = auth.uid())
);
CREATE POLICY "管理员可完全访问申请" ON applications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ai_conversations策略
CREATE POLICY "用户可管理自己的对话" ON ai_conversations FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "管理员可查看所有对话" ON ai_conversations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- messages策略
CREATE POLICY "用户可发送和查看自己的消息" ON messages FOR ALL TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "管理员可查看所有消息" ON messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- favorites策略
CREATE POLICY "用户可管理自己的收藏" ON favorites FOR ALL TO authenticated USING (user_id = auth.uid());

-- 公开视图
CREATE VIEW public_profiles AS SELECT id, username, display_name, avatar_url, user_type, role FROM profiles;
