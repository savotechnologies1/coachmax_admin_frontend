import { toDateOnly, ageGroupForYear } from "../../utils/dateTime";
import DateInput from "../form/DateInput";
import React, { useState, useEffect, useRef } from "react";
import { Player } from "../../types/player";
import { useUpdatePlayer } from "../../hooks/usePlayers";
import { useCategories } from "../../hooks/useCategories";
import { useProgramsByCategory, usePrograms } from "../../hooks/usePrograms";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import { 
  User, 
  Trophy, 
  HeartPulse, 
  Users, 
  Camera, 
  Star, 
  X, 
  Check, 
  AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import { getMediaUrl, getMediaFallback } from "../../utils/media";

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export default function EditPlayerModal({
  isOpen,
  onClose,
  player,
}: EditPlayerModalProps) {
  const updatePlayerMutation = useUpdatePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"general" | "football" | "medical" | "parent">("general");

  // Form State
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("MALE");
  const [school, setSchool] = useState("");
  const [playerStatus, setPlayerStatus] = useState("ACTIVE");

  // Football Details
  const [jerseyNumber, setJerseyNumber] = useState<string | number>("");
  const [prefferedFoot, setPrefferedFoot] = useState("RIGHT");
  const [rating, setRating] = useState(1);
  const [hoverRating, setHoverRating] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [programId, setProgramId] = useState("");

  // Medical & Comments
  const [isMedicalCondition, setIsMedicalCondition] = useState(false);
  const [medicalConditionDetails, setMedicalConditionDetails] = useState("");
  const [comments, setComments] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");

  // Parent / Emergency Contact
  const [parentFullName, setParentFullName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [parentRelationship, setParentRelationship] = useState("");

  // Profile Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Queries for Categories & Programs
  const { categories } = useCategories();
  const { programs: categoryPrograms } = useProgramsByCategory(categoryId);
  const { data: allProgramsData } = usePrograms(1, 100);
  const allPrograms = (allProgramsData as any)?.data || (allProgramsData as any)?.programs || [];
  const availablePrograms = categoryId ? (categoryPrograms.length > 0 ? categoryPrograms : allPrograms) : allPrograms;

  // Initialize form when player prop changes or modal opens
  useEffect(() => {
    if (player && isOpen) {
      setFullName(player.fullName || `${player.firstName || ""} ${player.lastName || ""}`.trim());

      setDob(toDateOnly(player.dob));

      setGender((player.gender || "MALE").toUpperCase());
      setSchool(player.school || "");
      setPlayerStatus(player.status || (player as any).playerStatus || "ACTIVE");

      setJerseyNumber(player.jerseyNumber !== undefined && player.jerseyNumber !== null ? player.jerseyNumber : "");
      setPrefferedFoot((player.prefferedFoot || player.preferredFoot || "RIGHT").toUpperCase());
      setRating(player.rating || player.skill ? Number(player.rating || player.skill) : 1);

      const catId = player.category?._id || (player as any).category || "";
      setCategoryId(typeof catId === "string" ? catId : catId?._id || "");

      const progId = player.programs?.[0]?._id || player.program?._id || (player as any).program || "";
      setProgramId(typeof progId === "string" ? progId : progId?._id || "");

      const hasMed = player.isMedicalCondition === true;
      setIsMedicalCondition(hasMed);
      setMedicalConditionDetails(player.medicalConditionDetails || player.medicalConditions || "");
      setComments(player.adminNote || (player as any).comments || "");
      setAdditionalComments((player as any).additionalComments || "");

      // Parent Details
      const parent = player.parentId;
      if (parent) {
        setParentFullName(parent.fullName || "");
        setParentEmail(parent.email || "");
        setParentPhone(parent.phone || "");
        setEmergencyContact(parent.emergencyContact || "");
        setParentRelationship(parent.relationship || "");
      } else {
        setParentFullName((player as any).contactName || "");
        setParentEmail(player.email || "");
        setParentPhone(player.phone || "");
        setEmergencyContact("");
        setParentRelationship((player as any).relationship || "");
      }

      setImageFile(null);
      if (player.profileImage) {
        setImagePreview(getMediaUrl(player.profileImage));
      } else {
        setImagePreview(getMediaFallback(player.fullName || "Player"));
      }
      setActiveTab("general");
    }
  }, [player, isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "profile");
      if (validationError) {
        toast.error(validationError);
        e.target.value = "";
        return;
      }
      setImageFile(normalized);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(normalized);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(getMediaFallback(fullName || "Player"));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;

    if (!fullName.trim()) {
      setActiveTab("general");
      return;
    }

    if (isMedicalCondition && !medicalConditionDetails.trim()) {
      setActiveTab("medical");
      toast.error("Please provide details for medical conditions");
      return;
    }
    const formData = new FormData();
    formData.append("fullName", fullName.trim());
    if (dob) formData.append("dob", dob);
    if (gender) formData.append("gender", gender);
    if (school) formData.append("school", school.trim());
    if (playerStatus) formData.append("playerStatus", playerStatus);

    if (jerseyNumber !== "" && jerseyNumber !== null) {
      formData.append("jerseyNumber", String(jerseyNumber));
    }
    if (prefferedFoot) formData.append("prefferedFoot", prefferedFoot);
    if (rating) formData.append("rating", String(rating));
    if (categoryId) formData.append("category", categoryId);
    if (programId) formData.append("programs", JSON.stringify([programId]));

    formData.append("isMedicalCondition", String(isMedicalCondition));
    formData.append("medicalConditionDetails", isMedicalCondition ? medicalConditionDetails.trim() : "");
    if (comments) formData.append("comments", comments.trim());
    if (additionalComments) formData.append("additionalComments", additionalComments.trim());

    // Parent details
    if (parentFullName) formData.append("parentFullName", parentFullName.trim());
    if (parentEmail) formData.append("parentEmail", parentEmail.trim());
    if (parentPhone) formData.append("parentPhone", parentPhone.trim());
    if (emergencyContact) formData.append("emergencyContact", emergencyContact.trim());
    if (parentRelationship) formData.append("parentRelationship", parentRelationship.trim());

    // Profile photo
    if (imageFile) {
      formData.append("profileImage", imageFile);
    }

    try {
      await updatePlayerMutation.mutateAsync({
        playerId: player._id,
        data: formData,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update player:", error);
    }
  };

  if (!isOpen || !player) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl w-full p-0 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-[#031549] text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img
              src={imagePreview || getMediaFallback(fullName || "Player")}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#0047FF] bg-white shadow-sm"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              title="Change photo"
            >
              <Camera size={16} />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-wide">{fullName || "Edit Player"}</h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-none ${
                playerStatus === "ACTIVE" 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {playerStatus}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Player ID: <span className="font-mono text-slate-400">{player._id}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
      />

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 gap-2 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "general"
              ? "border-[#0047FF] text-[#0047FF] dark:text-blue-400 bg-white dark:bg-slate-800 shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <User size={15} />
          <span>General Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("football")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "football"
              ? "border-[#0047FF] text-[#0047FF] dark:text-blue-400 bg-white dark:bg-slate-800 shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Trophy size={15} />
          <span>Football & Academy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("medical")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "medical"
              ? "border-[#0047FF] text-[#0047FF] dark:text-blue-400 bg-white dark:bg-slate-800 shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <HeartPulse size={15} />
          <span>Medical & Notes</span>
          {isMedicalCondition && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("parent")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "parent"
              ? "border-[#0047FF] text-[#0047FF] dark:text-blue-400 bg-white dark:bg-slate-800 shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users size={15} />
          <span>Parent / Contact</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-5">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <DateInput
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                  {dob && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Current-year group: U{ageGroupForYear(dob) ?? "?"}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Gender</Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-11 w-full rounded-none border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <Label>School</Label>
                  <Input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. St. Peters High School"
                  />
                </div>

                <div>
                  <Label>Player Status</Label>
                  <select
                    value={playerStatus}
                    onChange={(e) => setPlayerStatus(e.target.value)}
                    className="h-11 w-full rounded-none border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {imageFile ? "Change Selected File" : "Upload New Image"}
                    </button>
                    {imageFile && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs text-rose-500 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                    {imageFile && (
                      <span className="text-xs text-slate-500 truncate max-w-[150px]">
                        {imageFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FOOTBALL & ACADEMY */}
          {activeTab === "football" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setProgramId("");
                    }}
                    className="h-11 w-full rounded-none border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat: any) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Program</Label>
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="h-11 w-full rounded-none border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="">-- Select Program --</option>
                    {availablePrograms.map((prog: any) => (
                      <option key={prog._id} value={prog._id}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Jersey Number</Label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>

                <div>
                  <Label>Preferred Foot</Label>
                  <select
                    value={prefferedFoot}
                    onChange={(e) => setPrefferedFoot(e.target.value)}
                    className="h-11 w-full rounded-none border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="RIGHT">Right Foot (R)</option>
                    <option value="LEFT">Left Foot (L)</option>
                    <option value="BOTH">Both Feet (B)</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <Label>Player Skill / Rating (1 to 5 Stars)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (hoverRating || rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="p-1 transition-transform hover:scale-125 cursor-pointer"
                          >
                            <Star
                              size={22}
                              className={`${
                                isFilled
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-transparent text-slate-300 dark:text-slate-600"
                              } transition-colors`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {rating} of 5 Stars
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MEDICAL & NOTES */}
          {activeTab === "medical" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Medical Condition or Allergies?
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Flag any known health condition, asthma, allergy or medication requirements.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMedicalCondition(false)}
                      className={`px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        !isMedicalCondition
                          ? "bg-slate-700 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMedicalCondition(true)}
                      className={`px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isMedicalCondition
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {isMedicalCondition && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Label>Medical Condition Details</Label>
                    <TextArea
                      value={medicalConditionDetails}
                      onChange={(val) => setMedicalConditionDetails(val)}
                      rows={3}
                      placeholder="Specify medical conditions, asthma inhaler requirements, food allergies..."
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Admin Notes</Label>
                <TextArea
                  value={comments}
                  onChange={(val) => setComments(val)}
                  rows={3}
                  placeholder="Internal notes about the player..."
                />
              </div>

              <div>
                <Label>Additional Comments</Label>
                <TextArea
                  value={additionalComments}
                  onChange={(val) => setAdditionalComments(val)}
                  rows={2}
                  placeholder="Special instructions or coach remarks..."
                />
              </div>
            </div>
          )}

          {/* TAB 4: PARENT / GUARDIAN CONTACT */}
          {activeTab === "parent" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-[#0047FF]" />
                <span>
                  Updates here will update the parent contact profile linked to this player.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Parent / Guardian Full Name</Label>
                  <Input
                    type="text"
                    value={parentFullName}
                    onChange={(e) => setParentFullName(e.target.value)}
                    placeholder="e.g. John Doe Sr."
                  />
                </div>

                <div>
                  <Label>Relationship</Label>
                  <select
                    value={parentRelationship}
                    onChange={(e) => setParentRelationship(e.target.value)}
                    className="h-11 w-full rounded-none border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="">-- Select Relationship --</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <Label>Parent Email</Label>
                  <Input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                  />
                </div>

                <div>
                  <Label>Parent Phone</Label>
                  <Input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+61 400 000 000"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Secondary emergency phone number"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {activeTab === "general" && "Step 1 of 4: Basic Profile"}
            {activeTab === "football" && "Step 2 of 4: Football & Rating"}
            {activeTab === "medical" && "Step 3 of 4: Medical Details"}
            {activeTab === "parent" && "Step 4 of 4: Parent & Guardian"}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={updatePlayerMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <Button
              type="submit"
              size="sm"
              disabled={updatePlayerMutation.isPending}
              className="bg-[#0047FF] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 shadow-md flex items-center gap-1.5"
            >
              {updatePlayerMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
