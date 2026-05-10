import axiosInstance from '../lib/axios';
import { User, UserType, RegisterUserData, CompanyData, StudentData } from '../types/auth';

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterResponse {
  user: User;
  token?: string; // Token might not be returned for company registrations awaiting approval
  message?: string;
}

interface PasswordResetResponse {
  success: boolean;
  message: string;
}

interface GoogleAuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: RegisterUserData): Promise<RegisterResponse> => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  },

  resetPassword: async (email: string): Promise<PasswordResetResponse> => {
    const response = await axiosInstance.post('/auth/reset-password', { email });
    return response.data;
  },

  // For development/testing purposes - to be removed in production
  mockLogin: async (email: string, password: string): Promise<LoginResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (email === 'xxxxx@163.com' && password === 'admin123') {
      return {
        user: {
          id: 'admin1',
          name: 'Administrateur',
          email: 'xxxxx@163.com',
          type: 'admin',
          image: 'https://op-sourcecode.cdn.bcebos.com/source_code/projects/agentos/public/18028/20250821144145/assetes/user.png'
        },
        token: 'mock-admin-token'
      };
    }
    
    if (email === 'xxxxx@163.com' && password === 'etudiant123') {
      return {
        user: {
          id: 'student1',
          name: 'Étudiant',
          email: 'xxxxx@163.com',
          type: 'student',
          image: 'https://op-sourcecode.cdn.bcebos.com/source_code/projects/agentos/public/18028/20250821144145/assetes/user.png'
        },
        token: 'mock-student-token'
      };
    }
    
    if (email === 'xxxxx@163.com' && password === 'entreprise123') {
      return {
        user: {
          id: 'company1',
          name: 'Entreprise',
          email: 'xxxxx@163.com',
          type: 'company',
          image: 'https://op-sourcecode.cdn.bcebos.com/source_code/projects/agentos/public/18028/20250827213712/assetes/RDSI.png',
          approved: true
        },
        token: 'mock-company-token'
      };
    }

    // Check localStorage for registered users (mock database)
    const students = JSON.parse(localStorage.getItem('students') || '[]') as StudentData[];
    const student = students.find((s: StudentData) => s.email === email && s.password === password);
    if (student) {
      return {
        user: {
          id: student.id,
          name: student.name || `${student.firstName} ${student.lastName}`,
          email: student.email,
          type: 'student',
          image: student.photo || 'https://op-sourcecode.cdn.bcebos.com/source_code/projects/agentos/public/18028/20250821144145/assetes/user.png'
        },
        token: `mock-student-token-${student.id}`
      };
    }
    
    const approvedCompanies = JSON.parse(localStorage.getItem('approved_companies') || '[]') as CompanyData[];
    const company = approvedCompanies.find((c: CompanyData) => c.email === email && c.password === password);
    if (company) {
      return {
        user: {
          id: company.id,
          name: company.name,
          email: company.email,
          type: 'company',
          approved: true,
          image: company.image || 'https://op-sourcecode.cdn.bcebos.com/source_code/projects/agentos/public/18028/20250827213712/assetes/RDSI.png'
        },
        token: `mock-company-token-${company.id}`
      };
    }
    
    throw new Error('Identifiants incorrects');
  },

  // Google Auth implementation
  googleAuth: async (idToken: string): Promise<GoogleAuthResponse> => {
    try {
      // In production, this would send the token to your backend
      const response = await axiosInstance.post('/auth/google', { idToken });
      return response.data;
    } catch (error) {
      console.error('Google authentication error:', error);
      throw new Error('Google authentication failed. Please try again.');
    }
  },
  
  // Mock Google Auth for development
  mockGoogleAuth: async (googleUser: { email: string; name: string }): Promise<GoogleAuthResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create a mock user based on Google profile
    const mockUser: User = {
      id: `google-${Date.now()}`,
      name: googleUser.name,
      email: googleUser.email,
      type: 'student', // Default type for Google auth users
      image: 'https://op-sourcecode.cdn.bcebos.com/source_code/projects/agentos/public/18028/20250821144145/assetes/user.png',
    };
    
    // Store in localStorage to persist the session
    localStorage.setItem('google_auth_users', JSON.stringify([
      ...JSON.parse(localStorage.getItem('google_auth_users') || '[]'),
      mockUser
    ]));
    
    return {
      user: mockUser,
      token: `mock-google-token-${mockUser.id}`
    };
  }
};
