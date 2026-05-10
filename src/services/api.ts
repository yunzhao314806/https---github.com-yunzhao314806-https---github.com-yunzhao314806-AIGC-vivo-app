
/**
 * Service API centralisé pour Stages-DZ
 * Ce fichier regroupe tous les appels réseau de l'application
 * Actuellement, il utilise localStorage pour simuler une API
 * À terme, il pourra être facilement modifié pour utiliser une vraie API
 */

// Types
export interface User {
  id: string;
  name?: string;
  email: string;
  password?: string;
  type: 'student' | 'company' | 'admin';
  approved?: boolean;
  registrationDate?: string;
}

export interface Student extends User {
  type: 'student';
  firstName?: string;
  lastName?: string;
  university?: string;
  specialization?: string;
  bio?: string;
  phone?: string;
  city?: string;
  resume?: string;
  photo?: string;
}

export interface Company extends User {
  type: 'company';
  industry?: string;
  location?: string;
  website?: string;
  phone?: string;
  description?: string;
  image?: string;
  approved: boolean;
  registrationDate: string;
  approvalDate?: string;
}

export interface Offer {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  location: string;
  type: string;
  duration: string;
  isActive: boolean;
  createdAt: string;
  skills: string[];
  description: string;
  requirements?: string;
  benefits?: string;
}

export interface Application {
  id: string;
  offerId: string;
  offerTitle: string;
  studentId: string;
  studentName: string;
  companyId: string;
  companyName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  message?: string;
  resume?: string;
}

// Génère un ID unique
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Service d'authentification
export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier les utilisateurs étudiants
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const student = students.find((s: Student) => s.email === email && s.password === password);
    if (student) return student;
    
    // Vérifier les entreprises approuvées
    const companies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    const company = companies.find((c: Company) => c.email === email && c.password === password);
    if (company) return company;
    
    // Vérifier l'administrateur (hardcodé pour l'instant)
    if (email === 'xxxxx@163.com' && password === 'admin123') {
      return {
        id: 'admin1',
        email: 'xxxxx@163.com',
        type: 'admin',
        name: 'Administrateur'
      };
    }
    
    return null;
  },
  
  register: async (user: Partial<User>): Promise<User | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 700));
    
    if (user.type === 'student') {
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      const studentData = user as Partial<Student>;
      const newStudent: Student = {
        id: generateId(),
        email: user.email!,
        password: user.password,
        type: 'student',
        firstName: studentData.firstName || '',
        lastName: studentData.lastName || '',
        university: studentData.university || '',
        specialization: studentData.specialization || '',
        registrationDate: new Date().toISOString(),
        ...studentData
      };
      
      students.push(newStudent);
      localStorage.setItem('students', JSON.stringify(students));
      return newStudent;
    } else if (user.type === 'company') {
      const pendingCompanies = JSON.parse(localStorage.getItem('pending_companies') || '[]');
      const companyData = user as Partial<Company>;
      const newCompany: Company = {
        id: generateId(),
        email: user.email!,
        password: user.password,
        type: 'company',
        name: user.name || '',
        industry: companyData.industry || '',
        location: companyData.location || '',
        approved: false,
        registrationDate: new Date().toISOString(),
        ...companyData
      };
      
      pendingCompanies.push(newCompany);
      localStorage.setItem('pending_companies', JSON.stringify(pendingCompanies));
      return newCompany;
    }
    
    return null;
  },
  
  resetPassword: async (email: string): Promise<boolean> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier si l'email existe
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const companies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    
    const userExists = 
      students.some((s: Student) => s.email === email) || 
      companies.some((c: Company) => c.email === email);
    
    return userExists;
  }
};

// Service des offres
export const offerService = {
  getOffers: async (): Promise<Offer[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const offers = JSON.parse(localStorage.getItem('offers') || '[]');
    return offers;
  },
  
  getOfferById: async (id: string): Promise<Offer | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const offers = JSON.parse(localStorage.getItem('offers') || '[]');
    return offers.find((offer: Offer) => offer.id === id) || null;
  },
  
  createOffer: async (offer: Partial<Offer>, companyId: string, companyName: string): Promise<Offer> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const offers = JSON.parse(localStorage.getItem('offers') || '[]');
    const newOffer: Offer = {
      id: generateId(),
      companyId,
      companyName,
      isActive: true,
      createdAt: new Date().toISOString(),
      skills: [],
      ...offer
    } as Offer;
    
    offers.push(newOffer);
    localStorage.setItem('offers', JSON.stringify(offers));
    return newOffer;
  },
  
  updateOffer: async (id: string, offerData: Partial<Offer>): Promise<Offer | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const offers = JSON.parse(localStorage.getItem('offers') || '[]');
    const offerIndex = offers.findIndex((offer: Offer) => offer.id === id);
    
    if (offerIndex === -1) return null;
    
    const updatedOffer = { ...offers[offerIndex], ...offerData };
    offers[offerIndex] = updatedOffer;
    localStorage.setItem('offers', JSON.stringify(offers));
    
    return updatedOffer;
  },
  
  deleteOffer: async (id: string): Promise<boolean> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const offers = JSON.parse(localStorage.getItem('offers') || '[]');
    const updatedOffers = offers.filter((offer: Offer) => offer.id !== id);
    
    if (updatedOffers.length === offers.length) return false;
    
    localStorage.setItem('offers', JSON.stringify(updatedOffers));
    return true;
  }
};

// Service des entreprises
export const companyService = {
  getApprovedCompanies: async (): Promise<Company[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const companies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    return companies;
  },
  
  getPendingCompanies: async (): Promise<Company[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const companies = JSON.parse(localStorage.getItem('pending_companies') || '[]');
    return companies;
  },
  
  getCompanyById: async (id: string): Promise<Company | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const approvedCompanies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    const company = approvedCompanies.find((c: Company) => c.id === id);
    
    if (company) return company;
    
    const pendingCompanies = JSON.parse(localStorage.getItem('pending_companies') || '[]');
    return pendingCompanies.find((c: Company) => c.id === id) || null;
  },
  
  getCompanyByName: async (name: string): Promise<Company | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const approvedCompanies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    const company = approvedCompanies.find((c: Company) => c.name === name);
    
    if (company) return company;
    
    const pendingCompanies = JSON.parse(localStorage.getItem('pending_companies') || '[]');
    return pendingCompanies.find((c: Company) => c.name === name) || null;
  },
  
  approveCompany: async (id: string): Promise<Company | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const pendingCompanies = JSON.parse(localStorage.getItem('pending_companies') || '[]');
    const companyIndex = pendingCompanies.findIndex((c: Company) => c.id === id);
    
    if (companyIndex === -1) return null;
    
    const company = { ...pendingCompanies[companyIndex], approved: true, approvalDate: new Date().toISOString() };
    pendingCompanies.splice(companyIndex, 1);
    localStorage.setItem('pending_companies', JSON.stringify(pendingCompanies));
    
    const approvedCompanies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    approvedCompanies.push(company);
    localStorage.setItem('approved_companies', JSON.stringify(approvedCompanies));
    
    return company;
  },
  
  updateCompany: async (id: string, companyData: Partial<Company>): Promise<Company | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier dans les entreprises approuvées
    const approvedCompanies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    let companyIndex = approvedCompanies.findIndex((c: Company) => c.id === id);
    
    if (companyIndex !== -1) {
      const updatedCompany = { ...approvedCompanies[companyIndex], ...companyData };
      approvedCompanies[companyIndex] = updatedCompany;
      localStorage.setItem('approved_companies', JSON.stringify(approvedCompanies));
      return updatedCompany;
    }
    
    // Vérifier dans les entreprises en attente
    const pendingCompanies = JSON.parse(localStorage.getItem('pending_companies') || '[]');
    companyIndex = pendingCompanies.findIndex((c: Company) => c.id === id);
    
    if (companyIndex !== -1) {
      const updatedCompany = { ...pendingCompanies[companyIndex], ...companyData };
      pendingCompanies[companyIndex] = updatedCompany;
      localStorage.setItem('pending_companies', JSON.stringify(pendingCompanies));
      return updatedCompany;
    }
    
    return null;
  },
  
  deleteCompany: async (id: string): Promise<boolean> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Vérifier dans les entreprises approuvées
    const approvedCompanies = JSON.parse(localStorage.getItem('approved_companies') || '[]');
    const updatedApprovedCompanies = approvedCompanies.filter((c: Company) => c.id !== id);
    
    if (updatedApprovedCompanies.length !== approvedCompanies.length) {
      localStorage.setItem('approved_companies', JSON.stringify(updatedApprovedCompanies));
      return true;
    }
    
    // Vérifier dans les entreprises en attente
    const pendingCompanies = JSON.parse(localStorage.getItem('pending_companies') || '[]');
    const updatedPendingCompanies = pendingCompanies.filter((c: Company) => c.id !== id);
    
    if (updatedPendingCompanies.length !== pendingCompanies.length) {
      localStorage.setItem('pending_companies', JSON.stringify(updatedPendingCompanies));
      return true;
    }
    
    return false;
  }
};

// Service des candidatures
export const applicationService = {
  getApplications: async (): Promise<Application[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    return applications;
  },
  
  getApplicationById: async (id: string): Promise<Application | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    return applications.find((app: Application) => app.id === id) || null;
  },
  
  getApplicationsByStudentId: async (studentId: string): Promise<Application[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    return applications.filter((app: Application) => app.studentId === studentId);
  },
  
  getApplicationsByCompanyId: async (companyId: string): Promise<Application[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    return applications.filter((app: Application) => app.companyId === companyId);
  },
  
  getApplicationsByOfferId: async (offerId: string): Promise<Application[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    return applications.filter((app: Application) => app.offerId === offerId);
  },
  
  createApplication: async (application: Partial<Application>): Promise<Application> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const newApplication: Application = {
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...application
    } as Application;
    
    applications.push(newApplication);
    localStorage.setItem('applications', JSON.stringify(applications));
    return newApplication;
  },
  
  updateApplicationStatus: async (id: string, status: 'pending' | 'accepted' | 'rejected'): Promise<Application | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const appIndex = applications.findIndex((app: Application) => app.id === id);
    
    if (appIndex === -1) return null;
    
    const updatedApplication = { ...applications[appIndex], status };
    applications[appIndex] = updatedApplication;
    localStorage.setItem('applications', JSON.stringify(applications));
    
    return updatedApplication;
  },
  
  deleteApplication: async (id: string): Promise<boolean> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const updatedApplications = applications.filter((app: Application) => app.id !== id);
    
    if (updatedApplications.length === applications.length) return false;
    
    localStorage.setItem('applications', JSON.stringify(updatedApplications));
    return true;
  }
};

// Service des étudiants
export const studentService = {
  getStudents: async (): Promise<Student[]> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    return students;
  },
  
  getStudentById: async (id: string): Promise<Student | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    return students.find((s: Student) => s.id === id) || null;
  },
  
  updateStudent: async (id: string, studentData: Partial<Student>): Promise<Student | null> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const studentIndex = students.findIndex((s: Student) => s.id === id);
    
    if (studentIndex === -1) return null;
    
    const updatedStudent = { ...students[studentIndex], ...studentData };
    students[studentIndex] = updatedStudent;
    localStorage.setItem('students', JSON.stringify(students));
    
    return updatedStudent;
  },
  
  deleteStudent: async (id: string): Promise<boolean> => {
    // Simulation de délai réseau
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const updatedStudents = students.filter((s: Student) => s.id !== id);
    
    if (updatedStudents.length === students.length) return false;
    
    localStorage.setItem('students', JSON.stringify(updatedStudents));
    return true;
  }
};

// 强制清除旧数据并重新初始化中文数据
export const initMockData = () => {
  // 清除旧的英文数据，强制重新初始化
  localStorage.removeItem('approved_companies');
  localStorage.removeItem('pending_companies');
  
  // 企业数据 - 已批准的
  if (!localStorage.getItem('approved_companies')) {
    const mockCompanies: Company[] = [
      {
        id: 'comp1',
        name: '腾讯科技',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: '互联网科技',
        location: '深圳',
        website: 'https://www.tencent.com',
        phone: '+86 755 8601 0000',
        description: '中国领先的互联网增值服务提供商，致力于通过互联网服务提升人类生活品质。',
        approved: true,
        registrationDate: new Date(2024, 0, 15).toISOString(),
        approvalDate: new Date(2024, 0, 16).toISOString(),
        image: '' // 移除现实照片，使用默认图标
      },
      {
        id: 'comp2',
        name: '阿里巴巴集团',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: '电子商务',
        location: '杭州',
        website: 'https://www.alibaba.com',
        phone: '+86 571 8502 2088',
        description: '全球领先的电子商务公司，为世界各地的买家和卖家提供在线交易平台和商务服务。',
        approved: true,
        registrationDate: new Date(2024, 0, 20).toISOString(),
        approvalDate: new Date(2024, 0, 21).toISOString(),
        image: '' // 移除现实照片，使用默认图标
      },
      {
        id: 'comp3',
        name: '华为技术',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: '通信设备',
        location: '深圳',
        website: 'https://www.huawei.com',
        phone: '+86 755 2878 0808',
        description: '全球领先的信息与通信技术解决方案供应商，致力于把数字世界带入每个人、每个家庭、每个组织。',
        approved: true,
        registrationDate: new Date(2024, 0, 25).toISOString(),
        approvalDate: new Date(2024, 0, 26).toISOString(),
        image: '' // 移除现实照片，使用默认图标
      },
      {
        id: 'comp4',
        name: '字节跳动',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: '移动互联网',
        location: '北京',
        website: 'https://www.bytedance.com',
        phone: '+86 10 5985 0000',
        description: '全球领先的移动互联网公司，致力于用技术丰富人们的生活。',
        approved: true,
        registrationDate: new Date(2024, 1, 1).toISOString(),
        approvalDate: new Date(2024, 1, 2).toISOString(),
        image: '' // 移除现实照片，使用默认图标
      },
      {
        id: 'comp5',
        name: '小米科技',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: '智能硬件',
        location: '北京',
        website: 'https://www.mi.com',
        phone: '+86 400 100 5678',
        description: '以手机、智能硬件和IoT平台为核心的互联网公司，致力于让全球每个人都能享受科技带来的美好生活。',
        approved: true,
        registrationDate: new Date(2024, 1, 5).toISOString(),
        approvalDate: new Date(2024, 1, 6).toISOString(),
        image: '' // 移除现实照片，使用默认图标
      },
      {
        id: 'comp6',
        name: '百度科技',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: '人工智能',
        location: '北京',
        website: 'https://www.baidu.com',
        phone: '+86 10 5992 8888',
        description: '拥有强大互联网基础的领先AI公司，以科技让复杂的世界更简单。',
        approved: true,
        registrationDate: new Date(2024, 1, 10).toISOString(),
        approvalDate: new Date(2024, 1, 11).toISOString(),
        image: '' // 移除现实照片，使用默认图标
      }
    ];
    localStorage.setItem('approved_companies', JSON.stringify(mockCompanies));
  }
  
  // Entreprises en attente
  if (!localStorage.getItem('pending_companies')) {
    const mockPendingCompanies: Company[] = [
      {
        id: 'pend1',
        name: 'FinanceConsult',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: 'Finance',
        location: 'Alger',
        website: 'https://financeconsult.dz',
        phone: '+213 555 321 654',
        description: 'Cabinet de conseil financier offrant des services en comptabilité et gestion financière.',
        approved: false,
        registrationDate: new Date(2024, 2, 5).toISOString()
      },
      {
        id: 'pend2',
        name: 'EcoSolutions',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'company',
        industry: 'Environnement',
        location: 'Annaba',
        website: 'https://ecosolutions.dz',
        phone: '+213 555 987 321',
        description: 'Entreprise spécialisée dans les solutions écologiques et le développement durable.',
        approved: false,
        registrationDate: new Date(2024, 2, 10).toISOString()
      }
    ];
    localStorage.setItem('pending_companies', JSON.stringify(mockPendingCompanies));
  }
  
  // Étudiants
  if (!localStorage.getItem('students')) {
    const mockStudents: Student[] = [
      {
        id: 'stud1',
        firstName: 'Ahmed',
        lastName: 'Benali',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'student',
        university: 'Université d\'Alger',
        specialization: 'Informatique',
        bio: 'Étudiant en informatique passionné par le développement web et les nouvelles technologies.',
        phone: '+213 555 111 222',
        city: 'Alger',
        registrationDate: new Date(2024, 1, 5).toISOString()
      },
      {
        id: 'stud2',
        firstName: 'Lina',
        lastName: 'Hadid',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'student',
        university: 'Université d\'Oran',
        specialization: 'Marketing',
        bio: 'Étudiante en marketing passionnée par le marketing digital et les stratégies de communication.',
        phone: '+213 555 333 444',
        city: 'Oran',
        registrationDate: new Date(2024, 1, 10).toISOString()
      },
      {
        id: 'stud3',
        firstName: 'Karim',
        lastName: 'Mansouri',
        email: 'xxxxx@163.com',
        password: 'password123',
        type: 'student',
        university: 'Université de Constantine',
        specialization: 'Design Graphique',
        bio: 'Étudiant en design passionné par l\'illustration et le design d\'interface.',
        phone: '+213 555 555 666',
        city: 'Constantine',
        registrationDate: new Date(2024, 1, 15).toISOString()
      }
    ];
    localStorage.setItem('students', JSON.stringify(mockStudents));
  }
  
  // Offres
  if (!localStorage.getItem('offers')) {
    const mockOffers: Offer[] = [
      {
        id: 'off1',
        title: 'Stage en développement web',
        companyId: 'comp1',
        companyName: 'TechAlgeria',
        location: 'Alger',
        type: 'Développement',
        duration: '3 mois',
        isActive: true,
        createdAt: new Date(2024, 2, 15).toISOString(),
        skills: ['JavaScript', 'React', 'Node.js'],
        description: 'Stage de développement web pour étudiants en informatique',
        requirements: 'Connaissance en développement web frontend et backend. Expérience avec React et Node.js appréciée.',
        benefits: 'Ambiance de travail conviviale, possibilité d\'embauche à la fin du stage.'
      },
      {
        id: 'off2',
        title: 'Stage en marketing digital',
        companyId: 'comp2',
        companyName: 'MarketingPro',
        location: 'Oran',
        type: 'Marketing',
        duration: '2 mois',
        isActive: true,
        createdAt: new Date(2024, 3, 1).toISOString(),
        skills: ['SEO', 'Réseaux sociaux', 'Copywriting'],
        description: 'Stage en marketing pour apprendre les techniques du digital marketing',
        requirements: 'Connaissance des principes de base du marketing. Créativité et bon relationnel.',
        benefits: 'Formation complète en SEO et réseaux sociaux, certificat de stage.'
      },
      {
        id: 'off3',
        title: 'Stage en design graphique',
        companyId: 'comp3',
        companyName: 'DesignStudios',
        location: 'Constantine',
        type: 'Design',
        duration: '4 mois',
        isActive: false,
        createdAt: new Date(2024, 1, 20).toISOString(),
        skills: ['Photoshop', 'Illustrator', 'UI/UX'],
        description: 'Stage en design graphique pour étudiants en arts visuels',
        requirements: 'Maîtrise de la suite Adobe. Portfolio de projets créatifs.',
        benefits: 'Participation à des projets réels, mentorat personnalisé.'
      }
    ];
    localStorage.setItem('offers', JSON.stringify(mockOffers));
  }
  
  // Candidatures
  if (!localStorage.getItem('applications')) {
    const mockApplications: Application[] = [
      {
        id: 'app1',
        offerId: 'off1',
        offerTitle: 'Stage en développement web',
        studentId: 'stud1',
        studentName: 'Ahmed Benali',
        companyId: 'comp1',
        companyName: 'TechAlgeria',
        status: 'pending',
        createdAt: new Date(2024, 3, 10).toISOString(),
        message: 'Je suis très intéressé par cette opportunité de stage.',
      },
      {
        id: 'app2',
        offerId: 'off2',
        offerTitle: 'Stage en marketing digital',
        studentId: 'stud2',
        studentName: 'Lina Hadid',
        companyId: 'comp2',
        companyName: 'MarketingPro',
        status: 'accepted',
        createdAt: new Date(2024, 3, 5).toISOString(),
        message: 'Je souhaite postuler pour ce stage car il correspond parfaitement à mon projet professionnel.',
      },
      {
        id: 'app3',
        offerId: 'off3',
        offerTitle: 'Stage en design graphique',
        studentId: 'stud3',
        studentName: 'Karim Mansouri',
        companyId: 'comp3',
        companyName: 'DesignStudios',
        status: 'rejected',
        createdAt: new Date(2024, 2, 28).toISOString(),
        message: 'Je suis passionné par le design et souhaite développer mes compétences.',
      }
    ];
    localStorage.setItem('applications', JSON.stringify(mockApplications));
  }
};

// Initialiser les données pour le développement
initMockData();

// Export par défaut pour faciliter l'import
export default {
  authService,
  offerService,
  companyService,
  applicationService,
  studentService,
  initMockData
};

/*
/**
 * Service API centralisé pour Stages-DZ
 * Ce fichier implémente les appels API réels pour remplacer les mock data


import axios from 'axios';

// Types
export interface User {
  id: string;
  name?: string;
  email: string;
  password?: string;
  type: 'student' | 'company' | 'admin';
  approved?: boolean;
  registrationDate?: string;
}

export interface Student extends User {
  type: 'student';
  firstName?: string;
  lastName?: string;
  university?: string;
  specialization?: string;
  bio?: string;
  phone?: string;
  city?: string;
  resume?: string;
  photo?: string;
}

export interface Company extends User {
  type: 'company';
  industry?: string;
  location?: string;
  website?: string;
  phone?: string;
  description?: string;
  image?: string;
  approved: boolean;
  registrationDate: string;
  approvalDate?: string;
}

export interface Offer {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  location: string;
  type: string;
  duration: string;
  isActive: boolean;
  createdAt: string;
  skills: string[];
  description: string;
  requirements?: string;
  benefits?: string;
}

export interface Application {
  id: string;
  offerId: string;
  offerTitle: string;
  studentId: string;
  studentName: string;
  companyId: string;
  companyName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  message?: string;
  resume?: string;
}

// API base URL
const API_URL = 'https://api.example.com';

// Configuration de base pour Axios
const axiosConfig = {
  headers: {
    'Content-Type': 'application/json'
  }
};

// Service d'authentification
export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password }, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },
  
  register: async (userData: Partial<User>): Promise<User | null> => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  },
  
  resetPassword: async (email: string): Promise<boolean> => {
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { email }, axiosConfig);
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }
};

// Service des offres
export const offerService = {
  getOffers: async (): Promise<Offer[]> => {
    try {
      const response = await axios.get(`${API_URL}/offers`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Get offers error:', error);
      return [];
    }
  },
  
  getOfferById: async (id: string): Promise<Offer | null> => {
    try {
      const response = await axios.get(`${API_URL}/offers/${id}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get offer ${id} error:`, error);
      return null;
    }
  },
  
  createOffer: async (offer: Partial<Offer>, companyId: string, companyName: string): Promise<Offer | null> => {
    try {
      const offerData = {
        ...offer,
        companyId,
        companyName
      };
      
      const response = await axios.post(`${API_URL}/offers`, offerData, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Create offer error:', error);
      return null;
    }
  },
  
  updateOffer: async (id: string, offerData: Partial<Offer>): Promise<Offer | null> => {
    try {
      const response = await axios.put(`${API_URL}/offers/${id}`, offerData, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Update offer ${id} error:`, error);
      return null;
    }
  },
  
  deleteOffer: async (id: string): Promise<boolean> => {
    try {
      await axios.delete(`${API_URL}/offers/${id}`, axiosConfig);
      return true;
    } catch (error) {
      console.error(`Delete offer ${id} error:`, error);
      return false;
    }
  }
};

// Service des entreprises
export const companyService = {
  getApprovedCompanies: async (): Promise<Company[]> => {
    try {
      const response = await axios.get(`${API_URL}/companies/approved`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Get approved companies error:', error);
      return [];
    }
  },
  
  getPendingCompanies: async (): Promise<Company[]> => {
    try {
      const response = await axios.get(`${API_URL}/companies/pending`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Get pending companies error:', error);
      return [];
    }
  },
  
  getCompanyById: async (id: string): Promise<Company | null> => {
    try {
      const response = await axios.get(`${API_URL}/companies/${id}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get company ${id} error:`, error);
      return null;
    }
  },
  
  getCompanyByName: async (name: string): Promise<Company | null> => {
    try {
      const response = await axios.get(`${API_URL}/companies/name/${name}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get company by name "${name}" error:`, error);
      return null;
    }
  },
  
  approveCompany: async (id: string): Promise<Company | null> => {
    try {
      const response = await axios.post(`${API_URL}/companies/${id}/approve`, {}, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Approve company ${id} error:`, error);
      return null;
    }
  },
  
  updateCompany: async (id: string, companyData: Partial<Company>): Promise<Company | null> => {
    try {
      const response = await axios.put(`${API_URL}/companies/${id}`, companyData, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Update company ${id} error:`, error);
      return null;
    }
  },
  
  deleteCompany: async (id: string): Promise<boolean> => {
    try {
      await axios.delete(`${API_URL}/companies/${id}`, axiosConfig);
      return true;
    } catch (error) {
      console.error(`Delete company ${id} error:`, error);
      return false;
    }
  }
};

// Service des candidatures
export const applicationService = {
  getApplications: async (): Promise<Application[]> => {
    try {
      const response = await axios.get(`${API_URL}/applications`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Get applications error:', error);
      return [];
    }
  },
  
  getApplicationById: async (id: string): Promise<Application | null> => {
    try {
      const response = await axios.get(`${API_URL}/applications/${id}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get application ${id} error:`, error);
      return null;
    }
  },
  
  getApplicationsByStudentId: async (studentId: string): Promise<Application[]> => {
    try {
      const response = await axios.get(`${API_URL}/applications/student/${studentId}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get applications by student ${studentId} error:`, error);
      return [];
    }
  },
  
  getApplicationsByCompanyId: async (companyId: string): Promise<Application[]> => {
    try {
      const response = await axios.get(`${API_URL}/applications/company/${companyId}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get applications by company ${companyId} error:`, error);
      return [];
    }
  },
  
  getApplicationsByOfferId: async (offerId: string): Promise<Application[]> => {
    try {
      const response = await axios.get(`${API_URL}/applications/offer/${offerId}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get applications by offer ${offerId} error:`, error);
      return [];
    }
  },
  
  createApplication: async (application: Partial<Application>): Promise<Application | null> => {
    try {
      const response = await axios.post(`${API_URL}/applications`, application, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Create application error:', error);
      return null;
    }
  },
  
  updateApplicationStatus: async (id: string, status: 'pending' | 'accepted' | 'rejected'): Promise<Application | null> => {
    try {
      const response = await axios.put(`${API_URL}/applications/${id}/status`, { status }, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Update application ${id} status error:`, error);
      return null;
    }
  },
  
  deleteApplication: async (id: string): Promise<boolean> => {
    try {
      await axios.delete(`${API_URL}/applications/${id}`, axiosConfig);
      return true;
    } catch (error) {
      console.error(`Delete application ${id} error:`, error);
      return false;
    }
  }
};

// Service des étudiants
export const studentService = {
  getStudents: async (): Promise<Student[]> => {
    try {
      const response = await axios.get(`${API_URL}/students`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Get students error:', error);
      return [];
    }
  },
  
  getStudentById: async (id: string): Promise<Student | null> => {
    try {
      const response = await axios.get(`${API_URL}/students/${id}`, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Get student ${id} error:`, error);
      return null;
    }
  },
  
  updateStudent: async (id: string, studentData: Partial<Student>): Promise<Student | null> => {
    try {
      const response = await axios.put(`${API_URL}/students/${id}`, studentData, axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`Update student ${id} error:`, error);
      return null;
    }
  },
  
  deleteStudent: async (id: string): Promise<boolean> => {
    try {
      await axios.delete(`${API_URL}/students/${id}`, axiosConfig);
      return true;
    } catch (error) {
      console.error(`Delete student ${id} error:`, error);
      return false;
    }
  }
};

// Export par défaut pour faciliter l'import
export default {
  authService,
  offerService,
  companyService,
  applicationService,
  studentService
};
*/
