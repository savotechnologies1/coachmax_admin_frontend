import React from "react";
import { CheckCircle, X } from "lucide-react";

interface SuccessPopupProps {
  message: string;
  onClose: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-none p-6 shadow-xl max-w-md w-full relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Success</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{message}</p>
          <button 
            onClick={onClose}
            className="w-full mt-4 py-2 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-none font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPopup;
