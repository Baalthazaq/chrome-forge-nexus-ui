import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  impersonatedUser: any | null;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  getAllUsers: () => Promise<any[]>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatedUser, setImpersonatedUser] = useState<any | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        setIsAdmin(!!data && !error);
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const getAllUsers = async () => {
    if (!isAdmin) return [];

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('character_name');

      return profiles || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  const startImpersonation = async (userId: string) => {
    if (!isAdmin || !user) return;

    try {
      // Create impersonation session
      const { error } = await supabase
        .from('admin_sessions')
        .insert({
          admin_user_id: user.id,
          impersonated_user_id: userId
        });

      if (error) throw error;

      // Get the user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      setImpersonatedUser(profile);
    } catch (error) {
      console.error('Error starting impersonation:', error);
    }
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
  };

  return (
    <AdminContext.Provider value={{
      isAdmin,
      isLoading,
      impersonatedUser,
      startImpersonation,
      stopImpersonation,
      getAllUsers
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};