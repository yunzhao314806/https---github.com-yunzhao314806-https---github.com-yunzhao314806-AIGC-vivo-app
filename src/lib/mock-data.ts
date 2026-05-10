import { Profile, Job, Application, Resume, EnterpriseProfile, ChatMessage } from '@/types/types';

export const MOCK_PROFILES: Profile[] = [
  {
    id: 'mock-admin-1',
    username: 'admin',
    email: 'admin@miaoda.com',
    display_name: '管理员',
    user_type: 'admin',
    role: 'admin',
    avatar_url: null,
    bio: null,
    location: null,
    website: null,
    phone: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-jobseeker-1',
    username: 'jobseeker',
    email: 'jobseeker@miaoda.com',
    display_name: '求职者',
    user_type: 'jobseeker',
    role: 'user',
    avatar_url: null,
    bio: '积极寻找工作机会，擅长前端开发',
    location: '北京',
    website: null,
    phone: null,
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-06-30T00:00:00Z',
  },
  {
    id: 'mock-jobseeker-2',
    username: 'developer',
    email: 'developer@miaoda.com',
    display_name: '张三',
    user_type: 'jobseeker',
    role: 'user',
    avatar_url: null,
    bio: '全栈开发工程师，5年工作经验',
    location: '上海',
    website: 'https://github.com/zhangsan',
    phone: null,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-07-01T00:00:00Z',
  },
  {
    id: 'mock-enterprise-1',
    username: 'enterprise',
    email: 'enterprise@miaoda.com',
    display_name: '智聘科技有限公司',
    user_type: 'enterprise',
    role: 'user',
    avatar_url: null,
    bio: '专注于人工智能领域的创新企业',
    location: '上海',
    website: 'https://www.example.com',
    phone: null,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: 'mock-enterprise-2',
    username: 'techcompany',
    email: 'techcompany@miaoda.com',
    display_name: '未来科技集团',
    user_type: 'enterprise',
    role: 'user',
    avatar_url: null,
    bio: '全球领先的科技解决方案提供商',
    location: '深圳',
    website: 'https://www.futuretech.com',
    phone: null,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    enterprise_id: 'mock-enterprise-1',
    title: '前端开发工程师',
    description: '负责公司核心产品的前端开发工作，使用React、TypeScript等技术栈。',
    requirements: '本科及以上学历，3年以上前端开发经验，熟悉React、TypeScript、Node.js。',
    skills_required: ['React', 'TypeScript', 'Node.js', 'CSS'],
    salary_min: 15000,
    salary_max: 25000,
    location: '北京',
    industry: 'tech',
    job_type: '全职',
    experience_required: '3年以上',
    education_required: '本科',
    status: 'active',
    view_count: 128,
    apply_count: 23,
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-30T00:00:00Z',
  },
  {
    id: 'job-2',
    enterprise_id: 'mock-enterprise-1',
    title: 'AI算法工程师',
    description: '负责AI模型的研发与优化，推动人工智能技术在招聘场景的应用。',
    requirements: '硕士及以上学历，熟悉机器学习、深度学习框架，有NLP经验者优先。',
    skills_required: ['Python', 'TensorFlow', 'PyTorch', 'NLP'],
    salary_min: 25000,
    salary_max: 40000,
    location: '上海',
    industry: 'tech',
    job_type: '全职',
    experience_required: '2年以上',
    education_required: '硕士',
    status: 'active',
    view_count: 89,
    apply_count: 15,
    created_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-28T00:00:00Z',
  },
  {
    id: 'job-3',
    enterprise_id: 'mock-enterprise-2',
    title: '后端开发工程师',
    description: '负责企业级后端服务的设计与开发，保障系统稳定性和性能。',
    requirements: '本科及以上学历，熟悉Java/Python，有分布式系统开发经验。',
    skills_required: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
    salary_min: 18000,
    salary_max: 30000,
    location: '深圳',
    industry: 'tech',
    job_type: '全职',
    experience_required: '3年以上',
    education_required: '本科',
    status: 'active',
    view_count: 156,
    apply_count: 31,
    created_at: '2024-06-10T00:00:00Z',
    updated_at: '2024-06-25T00:00:00Z',
  },
  {
    id: 'job-4',
    enterprise_id: 'mock-enterprise-2',
    title: '产品经理',
    description: '负责招聘平台产品规划与设计，推动产品迭代优化。',
    requirements: '本科及以上学历，2年以上互联网产品经验，有招聘行业经验者优先。',
    skills_required: ['产品设计', '数据分析', '需求管理'],
    salary_min: 12000,
    salary_max: 20000,
    location: '广州',
    industry: 'tech',
    job_type: '全职',
    experience_required: '2年以上',
    education_required: '本科',
    status: 'active',
    view_count: 203,
    apply_count: 45,
    created_at: '2024-06-05T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
  {
    id: 'job-5',
    enterprise_id: 'mock-enterprise-1',
    title: 'UI/UX设计师',
    description: '负责产品界面设计与用户体验优化，打造优秀的视觉体验。',
    requirements: '本科及以上学历，2年以上设计经验，熟练使用Figma/Sketch。',
    skills_required: ['Figma', 'UI设计', 'UX研究'],
    salary_min: 10000,
    salary_max: 18000,
    location: '杭州',
    industry: 'tech',
    job_type: '全职',
    experience_required: '2年以上',
    education_required: '本科',
    status: 'active',
    view_count: 76,
    apply_count: 18,
    created_at: '2024-06-22T00:00:00Z',
    updated_at: '2024-06-29T00:00:00Z',
  },
];

export const MOCK_RESUMES: Resume[] = [
  {
    id: 'resume-1',
    profile_id: 'mock-jobseeker-1',
    title: '个人简历',
    file_url: null,
    file_name: 'resume.pdf',
    file_size: 1024000,
    file_type: 'application/pdf',
    uploaded_at: '2024-06-10T00:00:00Z',
    parsed_content: null,
    education: [
      { school: '北京大学', degree: '本科', major: '计算机科学', start_year: '2018', end_year: '2022' },
    ],
    experience: [
      { company: '某互联网公司', title: '前端开发工程师', description: '负责公司核心产品的前端开发', start_date: '2022-07-01', end_date: '2024-06-30' },
    ],
    skills: [
      { name: 'React', level: 90 },
      { name: 'TypeScript', level: 85 },
      { name: 'Node.js', level: 75 },
    ],
    summary: '3年前端开发经验，熟悉React生态，对技术有热情。',
    is_primary: true,
    created_at: '2024-06-10T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
];

export const MOCK_APPLICATIONS: Application[] = [
  {
    id: 'app-1',
    job_id: 'job-1',
    applicant_id: 'mock-jobseeker-1',
    resume_id: 'resume-1',
    status: 'reviewing',
    match_score: 85,
    candidate_status: 'interested',
    applied_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-25T00:00:00Z',
  },
  {
    id: 'app-2',
    job_id: 'job-2',
    applicant_id: 'mock-jobseeker-1',
    resume_id: 'resume-1',
    status: 'pending',
    match_score: 72,
    candidate_status: 'pending',
    applied_at: '2024-06-28T00:00:00Z',
    updated_at: '2024-06-28T00:00:00Z',
  },
];

export const MOCK_FAVORITES: { job_id: string; user_id: string }[] = [
  { job_id: 'job-1', user_id: 'mock-jobseeker-1' },
  { job_id: 'job-3', user_id: 'mock-jobseeker-1' },
  { job_id: 'job-5', user_id: 'mock-jobseeker-1' },
];

export const MOCK_MESSAGES: { id: string; sender_id: string; receiver_id: string; content: string; created_at: string }[] = [
  {
    id: 'msg-1',
    sender_id: 'mock-enterprise-1',
    receiver_id: 'mock-jobseeker-1',
    content: '您好！感谢您投递我们的"前端开发工程师"职位，经过简历筛选，我们希望邀请您参加面试。请问您方便的时间是？',
    created_at: '2024-06-25T10:00:00Z',
  },
  {
    id: 'msg-2',
    sender_id: 'mock-jobseeker-1',
    receiver_id: 'mock-enterprise-1',
    content: '您好！我本周三或周五都可以，请问哪个时间方便呢？',
    created_at: '2024-06-25T14:30:00Z',
  },
  {
    id: 'msg-3',
    sender_id: 'mock-enterprise-1',
    receiver_id: 'mock-jobseeker-1',
    content: '好的，那我们定在本周三下午2点，通过腾讯会议进行，会议链接我稍后发送给您。',
    created_at: '2024-06-25T15:00:00Z',
  },
];

export const MOCK_ENTERPRISE_PROFILES: EnterpriseProfile[] = [
  {
    id: 'ep-1',
    profile_id: 'mock-enterprise-1',
    company_name: '智聘科技有限公司',
    industry: 'tech',
    company_size: '100-500人',
    description: '专注于人工智能领域的创新企业，致力于打造智能化招聘平台。',
    logo_url: null,
    website: 'https://www.example.com',
    verified: true,
    created_at: '2024-01-10T00:00:00Z',
  },
];

export const MOCK_INDUSTRY_TEMPLATES = [
  { industry: 'tech', label: '互联网/科技', skill_tree: {} },
  { industry: 'finance', label: '金融', skill_tree: {} },
  { industry: 'manufacture', label: '制造业', skill_tree: {} },
  { industry: 'healthcare', label: '医疗健康', skill_tree: {} },
];

export const getMockJobs = (): Job[] => MOCK_JOBS;

export const getMockJobById = (id: string): Job | undefined => {
  return MOCK_JOBS.find(j => j.id === id);
};

export const getMockJobsByEnterprise = (enterpriseId: string): Job[] => {
  return MOCK_JOBS.filter(job => job.enterprise_id === enterpriseId);
};

export const getMockProfiles = (): Profile[] => MOCK_PROFILES;

export const getMockProfileById = (id: string): Profile | undefined => {
  return MOCK_PROFILES.find(p => p.id === id);
};

export const getMockResumes = (profileId: string): Resume[] => {
  return MOCK_RESUMES.filter(r => r.profile_id === profileId);
};

export const getMockApplications = (profileId: string): Application[] => {
  return MOCK_APPLICATIONS.filter(a => a.applicant_id === profileId);
};

export const getMockApplicationsForEnterprise = (enterpriseId: string): Application[] => {
  const enterpriseJobs = MOCK_JOBS.filter(j => j.enterprise_id === enterpriseId).map(j => j.id);
  return MOCK_APPLICATIONS.filter(a => enterpriseJobs.includes(a.job_id));
};

export const getMockFavorites = (userId: string): { job_id: string }[] => {
  return MOCK_FAVORITES.filter(f => f.user_id === userId);
};

export const getMockMessages = (userId: string): typeof MOCK_MESSAGES => {
  return MOCK_MESSAGES.filter(m => m.sender_id === userId || m.receiver_id === userId);
};

export const getStatsForJobseeker = (profileId: string) => {
  return {
    resumes: MOCK_RESUMES.filter(r => r.profile_id === profileId).length,
    applications: MOCK_APPLICATIONS.filter(a => a.applicant_id === profileId).length,
    favorites: MOCK_FAVORITES.filter(f => f.user_id === profileId).length,
  };
};

export const getStatsForEnterprise = (enterpriseId: string) => {
  const jobs = MOCK_JOBS.filter(j => j.enterprise_id === enterpriseId);
  const jobIds = jobs.map(j => j.id);
  const applications = MOCK_APPLICATIONS.filter(a => jobIds.includes(a.job_id));
  return {
    jobs: jobs.length,
    applications: applications.length,
    interviews: applications.filter(a => a.status === 'interview').length,
  };
};

export const getStatsForAdmin = () => ({
  total: MOCK_PROFILES.length,
  jobseekers: MOCK_PROFILES.filter(u => u.user_type === 'jobseeker').length,
  enterprises: MOCK_PROFILES.filter(u => u.user_type === 'enterprise').length,
  admins: MOCK_PROFILES.filter(u => u.role === 'admin').length,
});

export const getMockIndustryTemplates = () => MOCK_INDUSTRY_TEMPLATES;

export const getMockAiResponse = (input: string): string => {
  const responses: Record<string, string> = {
    '前端': '根据您的技能和经验，前端开发工程师是一个非常适合您的方向！您可以重点关注React、Vue等主流框架的深入学习，同时了解TypeScript和性能优化方面的知识。',
    '后端': '后端开发方向对您来说也是一个很好的选择。建议您加强Java/Python等语言的学习，了解Spring Boot、微服务架构等技术。',
    'AI': 'AI算法工程师需要扎实的数学基础和机器学习知识。建议您学习Python、TensorFlow/PyTorch等框架，同时关注NLP、CV等领域的最新进展。',
    '产品': '产品经理需要良好的沟通能力和产品思维。建议您学习数据分析、用户研究等技能，积累产品设计经验。',
  };
  
  for (const [key, value] of Object.entries(responses)) {
    if (input.includes(key)) return value;
  }
  
  return '您的技能非常全面！根据您的背景，以下几个方向都很适合您：\n\n1. 全栈开发：结合您的前端和后端能力\n2. 技术管理：如果您对团队管理感兴趣\n3. 技术专家：在某个领域深耕成为专家\n\n请问您对哪个方向更感兴趣呢？';
};