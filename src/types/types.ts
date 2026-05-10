// 用户角色枚举
export type UserRole = 'user' | 'admin';
export type UserType = 'jobseeker' | 'enterprise' | 'admin';
export type JobStatus = 'active' | 'closed' | 'draft';
export type ApplicationStatus = 'pending' | 'reviewing' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
export type SessionType = 'matching' | 'interview' | 'consultation';
export type CandidateStatus = 'interested' | 'pending' | 'unmatched';

// 用户Profile
export interface Profile {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  user_type: UserType;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

// 企业信息
export interface EnterpriseProfile {
  id: string;
  profile_id: string;
  company_name: string;
  industry?: string;
  company_size?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  verified: boolean;
  created_at: string;
}

// 简历
export interface Resume {
  id: string;
  profile_id: string;
  title: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  uploaded_at?: string;
  parsed_content?: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: SkillItem[];
  summary?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface EducationItem {
  school: string;
  degree: string;
  major: string;
  start_year: string;
  end_year: string;
}

export interface ExperienceItem {
  company: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}

export interface SkillItem {
  name: string;
  level: number; // 0-100
}

// 能力数据
export interface CapabilityData {
  id: string;
  profile_id: string;
  industry: string;
  skills: SkillItem[];
  radar_data: RadarData;
  tree_data: TreeNode;
  updated_at: string;
}

export interface RadarData {
  [key: string]: number;
}

export interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
}

// 职位
export interface Job {
  id: string;
  enterprise_id: string;
  title: string;
  description?: string;
  requirements?: string;
  skills_required: string[];
  salary_min?: number;
  salary_max?: number;
  location?: string;
  industry?: string;
  job_type: string;
  experience_required?: string;
  education_required?: string;
  status: JobStatus;
  view_count: number;
  apply_count: number;
  created_at: string;
  updated_at: string;
  // 关联企业信息
  enterprise?: Profile & { enterprise_profile?: EnterpriseProfile };
}

// 申请
export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  resume_id?: string;
  status: ApplicationStatus;
  match_score?: number;
  match_report?: MatchReport;
  candidate_status?: CandidateStatus;
  notes?: string;
  applied_at: string;
  updated_at: string;
  // 关联信息
  job?: Job;
  applicant?: Profile;
  resume?: Resume;
}

// 匹配报告
export interface MatchReport {
  overall_score: number;
  structural_score: number;
  rule_score: number;
  education_penalty: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  skill_match: { skill: string; matched: boolean; level?: number }[];
}

// AI对话
export interface AIConversation {
  id: string;
  user_id: string;
  session_type: SessionType;
  title?: string;
  messages: ChatMessage[];
  match_report?: MatchReport;
  job_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// 消息
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

// 收藏
export interface Favorite {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
  job?: Job;
}

// 行业模板
export interface IndustryTemplate {
  id: string;
  industry: string;
  label: string;
  radar_axes: string[];
  skill_tree: TreeNode;
  created_at: string;
}

// Auth上下文类型
export interface AuthContextType {
  user: Profile | null;
  session: unknown;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface RegisterData {
  username: string;
  password: string;
  display_name: string;
  user_type: UserType;
  company_name?: string;
}

// ── AI 模拟面试 ────────────────────────────────────────────────
export type InterviewStatus = 'active' | 'completed' | 'aborted';
export type InterviewDifficulty = 'junior' | 'intermediate' | 'senior';

export interface MockInterview {
  id: string;
  profile_id: string;
  direction: string;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  total_questions: number;
  current_question: number;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export interface MockInterviewMessage {
  id: string;
  interview_id: string;
  role: 'interviewer' | 'user' | 'system';
  content: string;
  question_index?: number;
  follow_up_round?: number;
  created_at: string;
}

export interface QuestionReview {
  question: string;
  pros: string;
  cons: string;
  score: number;
}

export interface ImprovementSuggestion {
  dimension: string;
  advice: string;
  resources: string;
}

export interface RadarItem {
  subject: string;
  value: number;
}

export interface MockInterviewReport {
  id: string;
  interview_id: string;
  profile_id: string;
  overall_score: number;
  radar_data: RadarItem[];
  question_reviews: QuestionReview[];
  suggestions: ImprovementSuggestion[];
  summary?: string;
  created_at: string;
}

