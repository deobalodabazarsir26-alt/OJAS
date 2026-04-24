import React, { useState, useEffect } from 'react';
import { Mail, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmailData {
  to: string;
  name: string;
  subject: string;
  body: string;
  otp: string;
}

const SystemNotification: React.FC = () => {
  const [notification, setNotification] = useState<EmailData | null>(null);

  useEffect(() => {
    const handleEmail = (event: any) => {
      setNotification(event.detail);
      
      // Auto-hide after 15 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 15000);
      
      return () => clearTimeout(timer);
    };

    window.addEventListener('system-email', handleEmail);
    return () => window.removeEventListener('system-email', handleEmail);
  }, []);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-blue-500 overflow-hidden"
        >
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">System Notification</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="hover:bg-blue-700 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">New Email Received</p>
                <h4 className="font-bold text-gray-900 leading-tight">{notification.subject}</h4>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
              <p className="text-sm text-gray-600 mb-3 italic">
                "Hello {notification.name}, your OTP for OJAS registration is below..."
              </p>
              <div className="flex justify-center">
                <div className="bg-white border-2 border-dashed border-blue-300 px-6 py-3 rounded-lg">
                  <span className="text-3xl font-black text-blue-700 tracking-[0.2em] font-mono">
                    {notification.otp}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
              <span>To: {notification.to}</span>
              <span>Just now</span>
            </div>
          </div>
          
          <div className="h-1 bg-blue-500 animate-progress-shrink origin-left" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SystemNotification;
