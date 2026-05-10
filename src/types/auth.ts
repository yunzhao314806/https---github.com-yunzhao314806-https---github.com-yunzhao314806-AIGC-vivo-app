// Define user types
export type UserType = 'company' | 'student' | 'admin' | null;

export interface User {
  id: string;
  name?: string;
  email: string;
  type: UserType;
  image?: string;
  approved?: boolean;
  // Additional fields that may be needed based on student/company info
  firstName?: string;
  lastName?: string;
  university?: string;
  specialization?: string;
  industry?: string;
  location?: string;
  registrationDate?: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  userType: UserType;
  firstName?: string;
  lastName?: string;
  name?: string;
  university?: string;
  specialization?: string;
  industry?: string;
  location?: string;
  website?: string;
  phone?: string;
  description?: string;
  [key: string]: string | UserType | undefined; // For additional fields
}

export interface CompanyData {
  id: string;
  name: string;
  email: string;
  type: 'company';
  approved: boolean;
  registrationDate: string;
  password?: string; // In a real system, this would be hashed
  industry?: string;
  location?: string;
  website?: string;
  phone?: string;
  description?: string;
  image?: string;
}

export interface StudentData {
  id: string;
  name?: string;
  email: string;
  password?: string; // In a real system, this would be hashed
  type: 'student';
  registrationDate: string;
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

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userType: UserType) => Promise<void>;
  logout: () => void;
  googleSignIn: () => Promise<void>;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterResponse {
  user: User;
  token?: string;
  message?: string;
}
