import React from "react";
import { Modal } from "../ui/modal";
import BroadcastComposer from "../../pages/Communication/BroadcastComposer";

interface ClassBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefilledClassId?: string;
  prefilledCategoryId?: string;
  prefilledProgramId?: string;
  prefilledTermId?: string;
  prefilledYear?: string;
  prefilledDayOfWeek?: string;
}

export const ClassBroadcastModal: React.FC<ClassBroadcastModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefilledClassId,
  prefilledCategoryId,
  prefilledProgramId,
  prefilledTermId,
  prefilledYear,
  prefilledDayOfWeek,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="max-w-3xl p-0 overflow-hidden">
      <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
        <BroadcastComposer
          isModal={true}
          onClose={onClose}
          onSuccess={() => {
            if (onSuccess) onSuccess();
            onClose();
          }}
          prefilledClassId={prefilledClassId}
          prefilledCategoryId={prefilledCategoryId}
          prefilledProgramId={prefilledProgramId}
          prefilledTermId={prefilledTermId}
          prefilledYear={prefilledYear}
          prefilledDayOfWeek={prefilledDayOfWeek}
        />
      </div>
    </Modal>
  );
};

export default ClassBroadcastModal;
