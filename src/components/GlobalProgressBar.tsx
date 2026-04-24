import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProgress } from '../context/ProgressContext';
import { Loader2 } from 'lucide-react';

const GlobalProgressBar: React.FC = () => {
  const { isProcessing, progress, message } = useProgress();

  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md mx-4"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                {progress > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-700">
                    {Math.round(progress)}%
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Request</h3>
              <p className="text-gray-600 mb-8 font-medium">{message}</p>
              
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-blue-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                />
              </div>
              
              <div className="mt-4 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Please do not close this window
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalProgressBar;
