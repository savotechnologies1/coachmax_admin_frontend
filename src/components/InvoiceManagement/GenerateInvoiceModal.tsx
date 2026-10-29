import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import DatePicker from "../form/date-picker";
import { useGenerateInvoice } from "../../hooks/useInvoices";

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: any | null;
}

export default function GenerateInvoiceModal({ isOpen, onClose, player }: GenerateInvoiceModalProps) {
  const generateInvoiceMutation = useGenerateInvoice();

  const [items, setItems] = useState([
    { title: "Academy Term 1 Coaching Fee", description: "12 Coaching Sessions", amount: 200 },
  ]);
  const [discount, setDiscount] = useState(20);
  const [dueDate, setDueDate] = useState("2026-08-15");
  const [type, setType] = useState("ACADEMY_FEE");
  const [description, setDescription] = useState("Current Term training fees");
  const [notes, setNotes] = useState("Payment due within 14 days.");

  useEffect(() => {
    if (isOpen) {
      // Reset or initialize values when modal opens if needed
    }
  }, [isOpen]);

  if (!player) return null;

  const handleAddItem = () => {
    setItems([...items, { title: "", description: "", amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Attempt to extract parentId safely
    let parentId = "";
    if (player.parentId) {
      if (typeof player.parentId === "string") {
        parentId = player.parentId;
      } else if (player.parentId._id) {
        parentId = player.parentId._id;
      }
    } else if (player.parent) {
      if (typeof player.parent === "string") {
        parentId = player.parent;
      } else if (player.parent._id || player.parent.id) {
        parentId = player.parent._id || player.parent.id;
      }
    }

    const playerId = player._id || player.id || player.playerId || "";
    const playerIds = playerId ? [playerId] : (Array.isArray(player.players) ? player.players : []);

    const payload: any = {
      parentId,
      playerId,
      players: playerIds,
      items: items.map(item => ({ ...item, amount: Number(item.amount) })),
      discount: Number(discount),
      dueDate,
      type,
      description,
      notes,
    };

    if (player.classId) {
      payload.classId = player.classId;
    }

    generateInvoiceMutation.mutate(
      payload,
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl p-6">
      <div className="w-full">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider">
          Generate Invoice for {player.fullName || player.firstName}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Type</label>
              <select required value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900">
                <option value="ACADEMY_FEE">ACADEMY_FEE</option>
                <option value="TOURNAMENT_FEE">TOURNAMENT_FEE</option>
                <option value="CAMP_FEE">CAMP_FEE</option>
                <option value="STORE_ORDER">STORE_ORDER</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
            <div>
              <DatePicker
                label="Due Date"
                defaultDate={dueDate}
                onChange={(_dates, dateStr) => setDueDate(dateStr)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Items</label>
              <button type="button" onClick={handleAddItem} className="text-xs font-semibold text-[#0047FF] hover:text-blue-700">+ Add Item</button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start border p-3 rounded-lg border-gray-100 dark:border-gray-800">
                  <div className="flex-1 space-y-3">
                    <input type="text" placeholder="Title" required value={item.title} onChange={(e) => handleItemChange(index, "title", e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900" />
                    <input type="text" placeholder="Description" required value={item.description} onChange={(e) => handleItemChange(index, "description", e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900" />
                  </div>
                  <div className="w-32">
                    <input type="number" placeholder="Amount" required min="0" value={item.amount} onChange={(e) => handleItemChange(index, "amount", e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900" />
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-rose-500 hover:text-rose-700 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Amount</label>
              <input type="number" required min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={generateInvoiceMutation.isPending} className="px-6 py-2.5 text-sm font-bold bg-[#0047FF] text-white rounded-none hover:bg-blue-700 transition-colors shadow-theme-xs disabled:opacity-50">
              {generateInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}