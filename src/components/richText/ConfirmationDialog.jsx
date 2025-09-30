import React from 'react';
import { colorClasses } from '../../utils/colorUtils';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg text-black font-semibold">{title || 'Confirm Action'}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md text-sm font-medium ${colorClasses.button.accent}`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-medium ${colorClasses.button.danger}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
