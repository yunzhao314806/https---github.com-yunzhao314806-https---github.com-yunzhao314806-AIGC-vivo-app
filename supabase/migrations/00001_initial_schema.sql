
-- 用户角色枚举
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.user_type AS ENUM ('jobseeker', 'enterprise', 'admin');
CREATE TYPE public.job_status AS ENUM ('active', 'closed', 'draft');
CREATE TYPE public.application_status AS ENUM ('pending', 'reviewing', 'interview', 'offer', 'rejected', 'withdrawn');
CREATE TYPE public.session_type AS ENUM ('matching', 'interview', 'consultation');
CREATE TYPE public.candidate_status AS ENUM ('interested', 'pending', 'unmatched');

-- 用户基础信息表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user',
  user_type public.user_type NOT NULL DEFAULT 'jobseeker',
  display_name text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 企业扩展信息表
CREATE TABLE public.enterprise_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  industry text,
  company_size text,
  description text,
  logo_url text,
  website text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 简历表
CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '我的简历',
  file_url text,
  file_name text,
  parsed_content text,
  education jsonb DEFAULT '[]'::jsonb,
  experience jsonb DEFAULT '[]'::jsonb,
  skills jsonb DEFAULT '[]'::jsonb,
  summary text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 能力数据表
CREATE TABLE public.capability_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  industry text NOT NULL DEFAULT 'tech',
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  radar_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tree_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- 职位表
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  requirements text,
  skills_required jsonb DEFAULT '[]'::jsonb,
  salary_min integer,
  salary_max integer,
  location text,
  industry text,
  job_type text DEFAULT '全职',
  experience_required text,
  education_required text,
  status public.job_status NOT NULL DEFAULT 'active',
  view_count integer NOT NULL DEFAULT 0,
  apply_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 申请表
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.resumes(id),
  status public.application_status NOT NULL DEFAULT 'pending',
  match_score numeric(5,2),
  match_report jsonb,
  candidate_status public.candidate_status DEFAULT 'pending',
  notes text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- AI对话表
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type public.session_type NOT NULL DEFAULT 'matching',
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  match_report jsonb,
  job_id uuid REFERENCES public.jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 消息表
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 收藏表
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- 自动更新updated_at的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 新用户自动同步到profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username text;
  v_user_type public.user_type;
  v_display_name text;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_user_type := COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'jobseeker'::public.user_type);
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', v_username);
  INSERT INTO public.profiles (id, username, email, role, user_type, display_name)
  VALUES (
    NEW.id,
    v_username,
    NEW.email,
    'user'::public.user_role,
    v_user_type,
    v_display_name
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
