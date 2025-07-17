import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  membershipLevel: 'free' | 'premium' | 'enterprise';
  membershipExpiry?: Date;
  subscriptionStatus: 'active' | 'inactive' | 'expired' | 'cancelled';
  usageLimit: number;
  usageCount: number;
  googleId?: string;
  registrationDate: Date;
  lastLoginDate: Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: Partial<User> }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Convert date strings back to Date objects
        user.membershipExpiry = user.membershipExpiry ? new Date(user.membershipExpiry) : undefined;
        user.registrationDate = new Date(user.registrationDate);
        user.lastLoginDate = new Date(user.lastLoginDate);
        
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data for demo
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        membershipLevel: 'free',
        subscriptionStatus: 'active',
        usageLimit: 100,
        usageCount: 15,
        registrationDate: new Date('2024-01-01'),
        lastLoginDate: new Date(),
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      dispatch({ type: 'LOGIN_SUCCESS', payload: mockUser });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Login failed. Please try again.' });
    }
  };

  const loginWithGoogle = async (googleToken: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Simulate Google OAuth API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock Google user data
      const mockGoogleUser: User = {
        id: 'google_1',
        email: 'user@gmail.com',
        name: 'Google User',
        avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        membershipLevel: 'premium',
        membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        subscriptionStatus: 'active',
        usageLimit: 1000,
        usageCount: 45,
        googleId: 'google_oauth_id_123',
        registrationDate: new Date('2023-06-15'),
        lastLoginDate: new Date(),
      };
      
      localStorage.setItem('user', JSON.stringify(mockGoogleUser));
      dispatch({ type: 'LOGIN_SUCCESS', payload: mockGoogleUser });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Google login failed. Please try again.' });
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Validate passwords match
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        id: Date.now().toString(),
        email: userData.email,
        name: userData.name,
        membershipLevel: 'free',
        subscriptionStatus: 'active',
        usageLimit: 50,
        usageCount: 0,
        registrationDate: new Date(),
        lastLoginDate: new Date(),
      };
      
      localStorage.setItem('user', JSON.stringify(newUser));
      dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
    } catch (error) {
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: error instanceof Error ? error.message : 'Registration failed. Please try again.' 
      });
    }
  };

  const logout = (): void => {
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch({ type: 'UPDATE_PROFILE', payload: updates });
      
      // Update localStorage
      if (state.user) {
        const updatedUser = { ...state.user, ...updates };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextValue = {
    ...state,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};