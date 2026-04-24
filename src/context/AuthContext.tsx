import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, GeneralUser, OfficeUser } from '../types';
import { sheetService } from '../services/sheetService';

interface AuthContextType {
  user: User | null;
  profile: GeneralUser | OfficeUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GeneralUser | OfficeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('ojas_current_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadProfile(parsedUser);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadProfile = async (u: User) => {
    if (u.User_Type === 'applicant') {
      const profiles = await sheetService.getAll<GeneralUser>('General_User');
      const p = profiles.find(item => String(item.User_ID) === String(u.User_ID));
      setProfile(p || null);
    } else if (u.User_Type === 'office') {
      const profiles = await sheetService.getAll<OfficeUser>('Office_User');
      const p = profiles.find(item => String(item.User_ID) === String(u.User_ID));
      setProfile(p || null);
    }
    setIsLoading(false);
  };

  const login = async (username: string, password: string) => {
    const users = await sheetService.getAll<User>('User');
    const u = users.find(item => item.User_Name === username && item.Password === password);
    if (u) {
      setUser(u);
      localStorage.setItem('ojas_current_user', JSON.stringify(u));
      await loadProfile(u);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('ojas_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
