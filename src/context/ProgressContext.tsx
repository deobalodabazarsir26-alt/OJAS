import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProgressContextType {
  isProcessing: boolean;
  progress: number;
  message: string;
  startProgress: (message: string) => void;
  updateProgress: (progress: number, message?: string) => void;
  stopProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const startProgress = (msg: string) => {
    setMessage(msg);
    setProgress(0);
    setIsProcessing(true);
  };

  const updateProgress = (prog: number, msg?: string) => {
    setProgress(prog);
    if (msg) setMessage(msg);
  };

  const stopProgress = () => {
    setIsProcessing(false);
    setProgress(0);
    setMessage('');
  };

  return (
    <ProgressContext.Provider value={{ isProcessing, progress, message, startProgress, updateProgress, stopProgress }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};
