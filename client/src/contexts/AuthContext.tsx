import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  walletAddress: string | null;
  authToken: string | null;
  isAuthenticated: boolean;
  setWalletAddress: (address: string | null) => void;
  setAuthToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const isAuthenticated = !!(walletAddress && authToken);

  const logout = () => {
    setWalletAddress(null);
    setAuthToken(null);
  };

  const value: AuthContextType = {
    walletAddress,
    authToken,
    isAuthenticated,
    setWalletAddress,
    setAuthToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};