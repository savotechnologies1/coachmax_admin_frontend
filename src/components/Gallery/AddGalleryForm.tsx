import React, { useState } from "react";
import {
 Image as ImageIcon,
 Shield,
 Layers
} from "lucide-react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import toast from "react-hot-toast";
import Select from "../form/Select";
import DropzoneComponent from "../form/form-elements/DropZone";
import SuccessPopup from "../SuccessPopup";
import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
 icon: LucideIcon;
 title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 mb-6 p-4 bg-[#031549] text-white rounded-none shadow-sm -mx-6 -mt-6 border-b border-[#082269]">
    <div className="p-2 bg-white/10 rounded-none text-white">
      <Icon size={18} />
    </div>
    <h5 className="text-lg font-bold text-white">{title}</h5>
  </div>
);

interface FormCardProps {
 children: React.ReactNode;
 className?: string;
}

const FormCard: React.FC<FormCardProps> = ({ children, className = "" }) => (
 <div className={`bg-white dark:bg-gray-900 rounded-none border border-gray-100 dark:border-gray-800 p-5 shadow-sm ${className}`}>
  {children}
 </div>
);

const AddGalleryForm = () => {
 const [showSuccessPopup, setShowSuccessPopup] = useState(false);
 const [formData, setFormData] = useState({
  title: "",
  category: "",
  description: "",
  status: "Published",
  images: []
 });

 const categories = [
  { value: "match", label: "Match Day" },
  { value: "training", label: "Training Sessions" },
  { value: "events", label: "Academy Events" },
  { value: "travel", label: "Team Travel" },
  { value: "fans", label: "Fan Zone" }
 ];

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log("Submitting Gallery Data:", formData);
  toast.success("Gallery created successfully!");
  setShowSuccessPopup(true);
 };

 return (
  <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
   <form onSubmit={handleSubmit} className="space-y-6">
    
    <FormCard>
      <SectionHeader icon={ImageIcon} title="Gallery Information" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="col-span-2">
         <Label>Gallery Title</Label>
         <Input 
          placeholder="e.g., Summer Cup 2024 Finals" 
          name="title" 
          value={formData.title} 
          onChange={handleInputChange} 
         />
       </div>
       <div>
         <Label>Event Category</Label>
         <Select 
          options={categories} 
          placeholder="Select Category"
          value={formData.category}
          onChange={(val: string) => setFormData(prev => ({...prev, category: val}))}
         />
       </div>
       <div>
         <Label>Visibility Status</Label>
         <Select 
          options={[
           {value: "Published", label: "Live - Global"}, 
           {value: "Internal", label: "Internal Only"}, 
           {value: "Archived", label: "Archived"}
          ]}
          value={formData.status}
          onChange={(val: string) => setFormData(prev => ({...prev, status: val}))}
         />
       </div>
       <div className="col-span-2">
         <Label>Brief Description</Label>
         <textarea 
          className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-none p-4 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-400"
          rows={3}
          placeholder="Capture the spirit of the event in a few words..."
          name="description"
          value={formData.description}
          onChange={handleInputChange}
         ></textarea>
       </div>
      </div>
    </FormCard>

    <FormCard>
      <SectionHeader icon={Layers} title="Upload Assets" />
      <div className="space-y-4">
       <DropzoneComponent
         policy="gallery"
        onUpload={(files: File[]) => setFormData(prev => ({...prev, images: files as any}))} 
       />
       <div className="flex items-center gap-2 p-3 bg-brand-50/50 dark:bg-brand-500/5 rounded-none text-brand-600 dark:text-brand-400">
         <Shield size={14} />
         <span className="text-[10px] font-bold ">Safe Cloud Storage: Images are optimized for mobile delivery.</span>
       </div>
      </div>
    </FormCard>

    {/* Bottom Actions */}
    <div className="flex items-center justify-end gap-3 pt-4">
     <Button 
      type="button" 
      variant="outline" 
      className="rounded-none px-10 font-bold text-gray-500 border-gray-200"
     >
      Cancel
     </Button>
     <Button 
      type="submit" 
      className="rounded-none px-16 font-bold  shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
     >
      Create Gallery
     </Button>
    </div>
   </form>

   {showSuccessPopup && (
    <SuccessPopup 
     message="Awesome! Your gallery is now live. Athletes and fans can view the moments in the app gallery section." 
     onClose={() => setShowSuccessPopup(false)} 
    />
   )}
  </div>
 );
};

export default AddGalleryForm;
