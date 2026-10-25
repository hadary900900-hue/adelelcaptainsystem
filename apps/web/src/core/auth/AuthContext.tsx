import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n/i18n';
import { apiClient } from '../api/client';
import { AuthUser } from '@erp/shared';

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken?: string, user?: AuthUser) => void;
  logout: () => Promise<void>;
  activeBranchId: string;
  setActiveBranchId: (branchId: string) => void;
  hasPermission: (permissionSlug: string) => boolean;
  language: 'en' | 'ar';
  toggleLanguage: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [activeBranchId, setActiveBranchIdState] = useState<string>(
    localStorage.getItem('activeBranchId') || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const currentToken = localStorage.getItem('accessToken');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res: any = await apiClient.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        const savedBranch = localStorage.getItem('activeBranchId');
        const userBranches = res.data.branches || [];
        if (savedBranch && userBranches.some((b: any) => b.id === savedBranch)) {
          setActiveBranchIdState(savedBranch);
        } else if (userBranches.length === 1) {
          // If user has only 1 branch, select it automatically
          setActiveBranchIdState(userBranches[0].id);
          localStorage.setItem('activeBranchId', userBranches[0].id);
        } else {
          // Multiple branches: require user to pick via modal!
          setActiveBranchIdState('');
          localStorage.removeItem('activeBranchId');
        }
      }
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('activeBranchId');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = (newToken: string, refreshToken?: string, userData?: AuthUser) => {
    localStorage.setItem('accessToken', newToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    setToken(newToken);
    if (userData) {
      setUser(userData);
      const userBranches = userData.branches || [];
      if (userBranches.length === 1) {
        setActiveBranchIdState(userBranches[0].id);
        localStorage.setItem('activeBranchId', userBranches[0].id);
      } else {
        // Clear active branch so user chooses immediately upon login!
        setActiveBranchIdState('');
        localStorage.removeItem('activeBranchId');
      }
    } else {
      fetchCurrentUser();
    }
  };

  const logout = async () => {
    try {
      const refToken = localStorage.getItem('refreshToken');
      await apiClient.post('/auth/logout', { refreshToken: refToken });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('activeBranchId');
      setToken(null);
      setUser(null);
      setActiveBranchIdState('');
    }
  };

  const setActiveBranchId = (branchId: string) => {
    localStorage.setItem('activeBranchId', branchId);
    setActiveBranchIdState(branchId);
  };

  const hasPermission = (permissionSlug: string): boolean => {
    if (!user) return false;
    if (user.permissions?.includes('admin.all')) return true;
    return !!user.permissions?.includes(permissionSlug);
  };

  const language = (i18n.language as 'en' | 'ar') || 'ar';
  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(nextLang);
    document.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        activeBranchId,
        setActiveBranchId,
        hasPermission,
        language,
        toggleLanguage,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
