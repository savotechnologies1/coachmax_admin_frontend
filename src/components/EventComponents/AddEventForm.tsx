// src/components/EventComponents/AddEventForm.tsx
import React, { useState, useEffect } from "react";
import {
  MapPin,
  Globe,
  Clock,
  Users,
  ChevronRight,
  ChevronLeft,
  Info,
  Phone
} from "lucide-react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import toast from "react-hot-toast";
import Select from "../form/Select";
import DatePicker from "../form/date-picker";
import TimePicker from "../form/time-picker";
import FormHeader from "../form/FormHeader";
import FormStepIndicator from "../form/FormStepIndicator";
import FormActions from "../form/FormActions";
import { requiredText, validateWithSchema, type FormErrors } from "../../utils/formValidation";
import { z } from "zod";
import DropzoneComponent from "../form/form-elements/DropZone";
import SuccessPopup from "../SuccessPopup";
import { LucideIcon } from "lucide-react";
import { createEvent, getAllEvents, updateEvent } from "../../api/eventApi";
import apiClient, { getErrorMessage } from "../../api/apiClient";
import { getMediaUrl } from "../../utils/media";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => (
  <FormHeader icon={Icon} title={title} className="mb-6 -mx-8 -mt-8 rounded-t-lg border-b border-[#082269]" />
);

interface FormCardProps {
  children: React.ReactNode;
  className?: string;
}

const FormCard: React.FC<FormCardProps> = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm ${className}`}>
    {children}
  </div>
);

interface AddEventFormProps {
  eventId?: string;
}

import { useNavigate } from "react-router";
import HolidayCampSessionConfig, { CampSessionRow } from "./HolidayCampSessionConfig";
import {
  addDateOnlyDays,
  dateOnlyFormValue,
  dateOnlyToLocalDate,
  formatDateOnly,
  toDateOnly,
} from "../../utils/dateTime";

const eventIdentitySchema = z.object({
  title: requiredText("Event title"),
  category: requiredText("Event category"),
  description: requiredText("Event description"),
  eventType: requiredText("Event type"),
});

const eventTimelineSchema = z.object({
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  registrationDeadline: z.date().nullable(),
  maxParticipants: z.string().refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0), "Participant limit must be a whole number greater than 0."),
  registrationFee: z.string().refine((value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0), "Registration fee must be 0 or more."),
}).superRefine((value, context) => {
  if (!value.startDate) context.addIssue({ code: "custom", path: ["startDate"], message: "Start date is required." });
  if (!value.endDate) context.addIssue({ code: "custom", path: ["endDate"], message: "End date is required." });
  if (value.startDate && value.endDate && dateOnlyFormValue(value.startDate) > dateOnlyFormValue(value.endDate)) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after the start date." });
  }
  if (value.registrationDeadline && value.startDate && dateOnlyFormValue(value.registrationDeadline) > dateOnlyFormValue(value.startDate)) {
    context.addIssue({ code: "custom", path: ["registrationDeadline"], message: "Registration deadline must be on or before the start date." });
  }
});

const AddEventForm: React.FC<AddEventFormProps> = ({ eventId }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FormErrors>({});
  const [eventBannerPreview, setEventBannerPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    maxParticipants: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
    startTime: "08:00 AM",
    endTime: "04:00 PM",
    venue: "",
    address: "",
    googleMapLink: "",
    contactPhone: "",
    website: "",
    registrationDeadline: null as Date | null,
    eventType: "TOURNAMENT",
    registrationFee: "",
    documentsRequired: "",
    organizer: "",
    sponsors: "",
    eventImg: null as File | null,
  });

  const [campSessions, setCampSessions] = useState<CampSessionRow[]>([]);
  const [defaultFullPrice, setDefaultFullPrice] = useState<number>(90);
  const [defaultHalfPrice, setDefaultHalfPrice] = useState<number>(70);

  // Helper to generate dates between startDate and endDate
  const generateCampDates = (start: Date, end: Date, existingSessions: CampSessionRow[] = []) => {
    const list: CampSessionRow[] = [];
    let currentDate = dateOnlyFormValue(start);
    const targetEnd = dateOnlyFormValue(end);
    if (!currentDate || !targetEnd || currentDate > targetEnd) return [];

    const existingMap = new Map<string, CampSessionRow>();
    existingSessions.forEach(s => existingMap.set(s.dateStr, s));

    // Safety cap at 60 days
    let count = 0;
    while (currentDate <= targetEnd && count < 60) {
      const dateStr = currentDate;
      const existing = existingMap.get(dateStr);

      if (existing) {
        list.push(existing);
      } else {
        list.push({
          dateStr,
          dayLabel: formatDateOnly(dateStr, { weekday: "long", day: "numeric", month: "short" }),
          dayOfWeek: formatDateOnly(dateStr, { weekday: "short" }),
          isEnabled: true,
          hasFullDay: true,
          hasHalfDay: true,
          fullDayStart: "08:00 AM",
          fullDayEnd: "04:00 PM",
          fullDayPrice: defaultFullPrice,
          halfDayStart: "08:00 AM",
          halfDayEnd: "02:00 PM",
          halfDayPrice: defaultHalfPrice,
        });
      }
      currentDate = addDateOnlyDays(currentDate, 1);
      count++;
    }
    return list;
  };

  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const res = await getAllEvents();
          const event = res.data.find((e: any) => e._id === eventId);
          if (event) {
            const existingBanner = event.bannerImage || event.eventImg || event.image;
            setEventBannerPreview(existingBanner ? getMediaUrl(existingBanner) : null);
            setFormData({
              title: event.title,
              description: event.description,
              category: event.category,
              maxParticipants: event.maxParticipants ? event.maxParticipants.toString() : "",
              startDate: dateOnlyToLocalDate(event.startDate),
              endDate: dateOnlyToLocalDate(event.endDate),
              startTime: event.startTime || "08:00 AM",
              endTime: event.endTime || "04:00 PM",
              venue: event.venueName || event.venue || "",
              address: event.address || "",
              googleMapLink: event.googleMapLink || "",
              contactPhone: event.contactPhone || "",
              website: event.website || "",
              registrationDeadline: dateOnlyToLocalDate(event.registrationDeadline),
              eventType: event.eventType || "TOURNAMENT",
              registrationFee: event.registrationFee ? event.registrationFee.toString() : "",
              documentsRequired: event.documentsRequired || "",
              organizer: event.organizer || "",
              sponsors: event.sponsors || "",
              eventImg: null,
            });

            if (event.campConfig) {
              if (event.campConfig.defaultFullDayPrice) setDefaultFullPrice(event.campConfig.defaultFullDayPrice);
              if (event.campConfig.defaultHalfDayPrice) setDefaultHalfPrice(event.campConfig.defaultHalfDayPrice);
            }

            // Also check if camp sessions already exist for this event
            try {
              const detailsRes = await apiClient.get(`/api/admin/getEventDetails/${eventId}`);
              if (detailsRes.data?.data?.campSessions && detailsRes.data.data.campSessions.length > 0) {
                const dbSess = detailsRes.data.data.campSessions;
                const groupedByDate: Record<string, any> = {};

                dbSess.forEach((s: any) => {
                  const dStr = toDateOnly(s.sessionDate);
                  if (!groupedByDate[dStr]) {
                    groupedByDate[dStr] = {
                      dateStr: dStr,
                      dayLabel: formatDateOnly(dStr, { weekday: "long", day: "numeric", month: "short" }),
                      dayOfWeek: formatDateOnly(dStr, { weekday: "short" }),
                      isEnabled: s.isAvailable,
                      hasFullDay: false,
                      hasHalfDay: false,
                      fullDayStart: "08:00 AM",
                      fullDayEnd: "04:00 PM",
                      fullDayPrice: 90,
                      halfDayStart: "08:00 AM",
                      halfDayEnd: "02:00 PM",
                      halfDayPrice: 70,
                    };
                  }
                  if (s.sessionType === "FULL_DAY") {
                    groupedByDate[dStr].hasFullDay = true;
                    groupedByDate[dStr].fullDayStart = s.startTime;
                    groupedByDate[dStr].fullDayEnd = s.endTime;
                    groupedByDate[dStr].fullDayPrice = s.fee;
                    if (s.isAvailable) groupedByDate[dStr].isEnabled = true;
                  }
                  if (s.sessionType === "HALF_DAY") {
                    groupedByDate[dStr].hasHalfDay = true;
                    groupedByDate[dStr].halfDayStart = s.startTime;
                    groupedByDate[dStr].halfDayEnd = s.endTime;
                    groupedByDate[dStr].halfDayPrice = s.fee;
                    if (s.isAvailable) groupedByDate[dStr].isEnabled = true;
                  }
                });
                setCampSessions(Object.values(groupedByDate));
              }
            } catch (e) {
              console.error(e);
            }
          }
        } catch (err) {
          console.error("Error fetching event for edit:", err);
        }
      };
      fetchEvent();
    }
  }, [eventId]);

  const isHolidayCamp = formData.eventType === "CAMP" || formData.eventType === "HOLIDAY CAMP";

  // Re-generate or adjust camp sessions when start/end dates change
  useEffect(() => {
    if (isHolidayCamp && formData.startDate && formData.endDate) {
      if (formData.startDate <= formData.endDate) {
        setCampSessions(prev => generateCampDates(formData.startDate!, formData.endDate!, prev));
      }
    }
  }, [formData.startDate, formData.endDate, isHolidayCamp]);

  const categories = [
    { value: "Sports", label: "Sports" },
    { value: "Training", label: "Training Session" },
    { value: "Tournament", label: "Tournament" },
    { value: "Friendly", label: "Friendly Match" },
    { value: "Scouting", label: "Scouting Event" },
    { value: "Camp", label: "Holiday Camp" }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationErrors((previous) => { const next = { ...previous }; delete next[name]; return next; });
  };

  const handleDateChange = (date: Date | null, field: string) => {
    setFormData(prev => ({ ...prev, [field]: date }));
    setValidationErrors((previous) => {
      const next = { ...previous };
      [field, "endDate", "registrationDeadline"].forEach((key) => delete next[key]);
      return next;
    });
  };

  const validateIdentity = () => {
    const result = validateWithSchema(eventIdentitySchema, formData);
    setValidationErrors((previous) => {
      const next = { ...previous };
      ["title", "category", "description", "eventType"].forEach((field) => delete next[field]);
      return { ...next, ...result.errors };
    });
    return result.success;
  };

  const validateTimeline = () => {
    const result = validateWithSchema(eventTimelineSchema, formData);
    const errors = { ...result.errors };
    if (isHolidayCamp && !campSessions.some((session) => session.isEnabled && (session.hasFullDay || session.hasHalfDay))) {
      errors.sessions = "Enable at least one camp day and session.";
    }
    setValidationErrors((previous) => {
      const next = { ...previous };
      ["startDate", "endDate", "registrationDeadline", "maxParticipants", "registrationFee", "sessions"].forEach((field) => delete next[field]);
      return { ...next, ...errors };
    });
    return result.success && Object.keys(errors).length === 0;
  };

  const handleFileChange = (files: File[]) => {
    if (files.length > 0) {
      setFormData(prev => ({ ...prev, eventImg: files[0] }));
      setEventBannerPreview(URL.createObjectURL(files[0]));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Safety check: Only submit if we are on the final step
    if (currentStep < 3) {
      nextStep();
      return;
    }

    // Fields from earlier wizard steps are unmounted, so validate each step
    // again before sending the final payload.
    if (!validateIdentity()) {
      setCurrentStep(1);
      return;
    }
    if (!validateTimeline()) {
      setCurrentStep(2);
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof Date) {
          // Event and camp dates are calendar dates. Preserve the selected day
          // instead of serialising local midnight through UTC.
          data.append(key, dateOnlyFormValue(value));
        } else if (value !== null && key !== "eventImg") {
          data.append(key, key === "title" ? String(value).trim() : value as string | Blob);
        }
      });

      if (formData.eventImg) {
        data.append("eventImg", formData.eventImg);
      }

      if (isHolidayCamp) {
        // Build flat array of sessions from campSessions rows
        const flatSessions: any[] = [];
        campSessions.forEach(cs => {
          if (cs.hasFullDay) {
            flatSessions.push({
              sessionDate: cs.dateStr,
              sessionType: "FULL_DAY",
              sessionLabel: "Full Day",
              startTime: cs.fullDayStart || "08:00 AM",
              endTime: cs.fullDayEnd || "04:00 PM",
              fee: cs.fullDayPrice || defaultFullPrice,
              isAvailable: cs.isEnabled,
            });
          }
          if (cs.hasHalfDay) {
            flatSessions.push({
              sessionDate: cs.dateStr,
              sessionType: "HALF_DAY",
              sessionLabel: "Half Day",
              startTime: cs.halfDayStart || "08:00 AM",
              endTime: cs.halfDayEnd || "02:00 PM",
              fee: cs.halfDayPrice || defaultHalfPrice,
              isAvailable: cs.isEnabled,
            });
          }
        });

        data.append("sessions", JSON.stringify(flatSessions));
        data.append(
          "campConfig",
          JSON.stringify({
            defaultFullDayPrice: defaultFullPrice,
            defaultHalfDayPrice: defaultHalfPrice,
          })
        );
      }

      if (eventId) {
        await updateEvent(eventId, data);
        if (isHolidayCamp) {
          // Also call configureCampSessions to ensure sessions are synchronized
          const flatSessions: any[] = [];
          campSessions.forEach(cs => {
            if (cs.hasFullDay) {
              flatSessions.push({
                sessionDate: cs.dateStr,
                sessionType: "FULL_DAY",
                sessionLabel: "Full Day",
                startTime: cs.fullDayStart || "08:00 AM",
                endTime: cs.fullDayEnd || "04:00 PM",
                fee: cs.fullDayPrice || defaultFullPrice,
                isAvailable: cs.isEnabled,
              });
            }
            if (cs.hasHalfDay) {
              flatSessions.push({
                sessionDate: cs.dateStr,
                sessionType: "HALF_DAY",
                sessionLabel: "Half Day",
                startTime: cs.halfDayStart || "08:00 AM",
                endTime: cs.halfDayEnd || "02:00 PM",
                fee: cs.halfDayPrice || defaultHalfPrice,
                isAvailable: cs.isEnabled,
              });
            }
          });
          await apiClient.post(`/api/admin/events/${eventId}/sessions`, {
            sessions: flatSessions,
            campConfig: {
              defaultFullDayPrice: defaultFullPrice,
              defaultHalfDayPrice: defaultHalfPrice,
            },
          });
        }
        toast.success("Event updated successfully!");
      } else {
        const createRes = await createEvent(data);
        toast.success("Event profile created successfully!");
      }
      setShowSuccessPopup(true);
    } catch (err) {
      console.error("Error saving event:", err);
      if (!(err as any)?._handled) {
        toast.error(getErrorMessage(err, "Failed to save the event. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateIdentity()) return;
    if (currentStep === 2 && !validateTimeline()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const steps = [
    { label: "Identity", description: "Event details" },
    { label: "Timeline", description: "Dates and registration" },
    { label: "Venue & assets", description: "Location and media" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <FormStepIndicator
        className="mb-8 border-b border-gray-200 pb-4 dark:border-gray-800"
        steps={steps}
        currentStep={currentStep}
        onStepSelect={(step) => {
          if (step === 1) setCurrentStep(1);
          else if (step === 2 && validateIdentity()) setCurrentStep(2);
          else if (step === 3 && validateIdentity() && validateTimeline()) setCurrentStep(3);
        }}
      />

      <form data-coachmax-form noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (currentStep === 3) handleSubmit(e);
          else nextStep();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && currentStep < 3) {
            e.preventDefault();
            nextStep();
          }
        }}
        className="space-y-6"
      >
        {currentStep === 1 && (
          <FormCard>
            <SectionHeader icon={Info} title="Event Identity" />
            <div className="space-y-6">
              <div>
                  <Label htmlFor="event-title">Event Title <span className="text-error-600">*</span></Label>
                <Input
                  id="event-title"
                  placeholder="e.g., Summer Youth Cup"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  aria-required="true"
                  aria-invalid={Boolean(validationErrors.title)}
                  aria-describedby={validationErrors.title ? "event-title-error" : undefined}
                />
                {validationErrors.title && <p id="event-title-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.title}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="event-category">Category <span className="text-error-600">*</span></Label>
                  <Select
                    id="event-category"
                    aria-label="Event category"
                    aria-required
                    aria-invalid={Boolean(validationErrors.category)}
                    aria-describedby={validationErrors.category ? "event-category-error" : undefined}
                    options={categories}
                    placeholder="Select Event Category"
                    value={formData.category}
                    onChange={(val: string) => { setFormData(prev => ({ ...prev, category: val })); setValidationErrors((previous) => { const next = { ...previous }; delete next.category; return next; }); }}
                  />
                  {validationErrors.category && <p id="event-category-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.category}</p>}
                </div>
                <div>
                  <Label>Max Participants</Label>
                  <div className="relative">
                    <Input
                      id="event-max-participants"
                      min="1"
                      step="1"
                      type="number"
                      placeholder="e.g., 20"
                      name="maxParticipants"
                      value={formData.maxParticipants}
                      onChange={handleInputChange}
                      aria-invalid={Boolean(validationErrors.maxParticipants)}
                      aria-describedby={validationErrors.maxParticipants ? "event-max-participants-error" : undefined}
                    />
                    {validationErrors.maxParticipants && <p id="event-max-participants-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.maxParticipants}</p>}
                    <Users size={16} className="absolute right-3 top-3.5 text-gray-400" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="event-type">Event Type <span className="text-error-600">*</span></Label>
                  <Select
                    id="event-type"
                    aria-label="Event type"
                    aria-required
                    aria-invalid={Boolean(validationErrors.eventType)}
                    aria-describedby={validationErrors.eventType ? "event-type-error" : undefined}
                    options={[
                      { value: "TOURNAMENT", label: "Tournament" },
                      { value: "LEAGUE", label: "League" },
                      { value: "CAMP", label: "Holiday Camp" }
                    ]}
                    placeholder="Select Type"
                    value={formData.eventType === "HOLIDAY CAMP" ? "CAMP" : formData.eventType}
                    onChange={(val: string) => {
                      setFormData(prev => ({
                        ...prev,
                        eventType: val,
                        category: val === "CAMP" ? "Camp" : prev.category
                      }));
                      setValidationErrors((previous) => {
                        const next = { ...previous };
                        delete next.eventType;
                        if (val === "CAMP") delete next.category;
                        return next;
                      });
                    }}
                  />
                  {validationErrors.eventType && <p id="event-type-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.eventType}</p>}
                </div>
                <div>
                  <Label>Registration Fee</Label>
                  <Input
                    id="event-registration-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={isHolidayCamp ? "Calculated via sessions" : "e.g., 25"}
                    name="registrationFee"
                    value={formData.registrationFee}
                    onChange={handleInputChange}
                    disabled={isHolidayCamp}
                  />
                  {isHolidayCamp && (
                    <span className="text-[10px] text-brand-500 font-semibold mt-1 block">
                      *For Holiday Camp, pricing is determined per session in Step 2.
                    </span>
                  )}
                </div>
                <div>
                  <Label>Documents Required</Label>
                  <Input
                    placeholder="e.g., BIRTH_CERTIFICATE,PHOTO"
                    name="documentsRequired"
                    value={formData.documentsRequired}
                    onChange={handleInputChange}
                    aria-invalid={Boolean(validationErrors.registrationFee)}
                    aria-describedby={validationErrors.registrationFee ? "event-registration-fee-error" : undefined}
                  />
                  {validationErrors.registrationFee && <p id="event-registration-fee-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.registrationFee}</p>}
                </div>
                <div>
                  <Label>Organizer</Label>
                  <Input
                    placeholder="e.g., London Youth Sports"
                    name="organizer"
                    value={formData.organizer}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Label>Sponsors</Label>
                  <Input
                    placeholder="e.g., Sponsor A,Sponsor B"
                    name="sponsors"
                    value={formData.sponsors}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="event-description">Event Description <span className="text-error-600">*</span></Label>
                <textarea
                  id="event-description"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-none p-5 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-400 min-h-[150px]"
                  placeholder="Tell us more about the weekend match..."
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  aria-required="true"
                  aria-invalid={Boolean(validationErrors.description)}
                  aria-describedby={validationErrors.description ? "event-description-error" : undefined}
                ></textarea>
                {validationErrors.description && <p id="event-description-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.description}</p>}
              </div>
            </div>
          </FormCard>
        )}

        {currentStep === 2 && (
          <FormCard>
            <SectionHeader icon={Clock} title="Timeline & Schedule" />
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <DatePicker
                    id="event-start-date"
                    label="Start Date *"
                    defaultDate={formData.startDate || undefined}
                    onChange={(dates: Date[]) => handleDateChange(dates[0] || null, "startDate")}
                    placeholder="Select Date"
                    required
                    error={validationErrors.startDate}
                  />
                  {validationErrors.startDate && <p id="event-start-date-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.startDate}</p>}
                </div>
                <div>
                  <DatePicker
                    id="event-end-date"
                    label="End Date *"
                    defaultDate={formData.endDate || undefined}
                    onChange={(dates: Date[]) => handleDateChange(dates[0] || null, "endDate")}
                    placeholder="Select Date"
                    required
                    error={validationErrors.endDate}
                  />
                  {validationErrors.endDate && <p id="event-end-date-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.endDate}</p>}
                </div>
                <div>
                  <Label>Start Time</Label>
                  <TimePicker
                    value={formData.startTime}
                    onChange={(time) => setFormData(p => ({ ...p, startTime: time }))}
                    placeholder="10:00 AM"
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <TimePicker
                    value={formData.endTime}
                    onChange={(time) => setFormData(p => ({ ...p, endTime: time }))}
                    placeholder="06:00 PM"
                  />
                </div>
                <div className="col-span-2">
                  <DatePicker
                    id="event-registration-deadline"
                    label="Registration Deadline (optional)"
                    defaultDate={formData.registrationDeadline || undefined}
                    onChange={(dates: Date[]) => handleDateChange(dates[0] || null, "registrationDeadline")}
                    placeholder="Last day to enroll..."
                  />
                  {validationErrors.registrationDeadline && <p id="event-registration-deadline-error" role="alert" className="mt-1 text-sm text-error-600">{validationErrors.registrationDeadline}</p>}
                </div>
              </div>

              {/* Holiday Camp Date Selection & Session Pricing Table */}
              {isHolidayCamp && (
                <HolidayCampSessionConfig
                  sessions={campSessions}
                  onChange={setCampSessions}
                  defaultFullPrice={defaultFullPrice}
                  defaultHalfPrice={defaultHalfPrice}
                  onDefaultFullPriceChange={setDefaultFullPrice}
                  onDefaultHalfPriceChange={setDefaultHalfPrice}
                />
              )}
              {validationErrors.sessions && <p role="alert" className="text-sm text-error-600">{validationErrors.sessions}</p>}
            </div>
          </FormCard>
        )}

        {currentStep === 3 && (
          <FormCard>
            <SectionHeader icon={MapPin} title="Logistics & Assets" />
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <Label>Venue Name</Label>
                  <Input
                    placeholder="e.g., City Ground Arena"
                    name="venue"
                    value={formData.venue}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Full Address</Label>
                  <div className="relative">
                    <Input
                      placeholder="e.g., Bhopal, MP"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                    <MapPin size={16} className="absolute right-3 top-3.5 text-gray-400" />
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>Google Maps Location Link</Label>
                  <Input
                    placeholder="https://maps.google.com/..."
                    name="googleMapLink"
                    value={formData.googleMapLink}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <div className="relative">
                    <Input
                      placeholder="9876543210"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                    />
                    <Phone size={16} className="absolute right-3 top-3.5 text-gray-400" />
                  </div>
                </div>
                <div>
                  <Label>Event Website</Label>
                  <div className="relative">
                    <Input
                      placeholder="www.example.com"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                    />
                    <Globe size={16} className="absolute right-3 top-3.5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <Label>Official Event Banner <span className="text-xs font-normal text-gray-500">(optional)</span></Label>
                <DropzoneComponent policy="eventBanner" onUpload={handleFileChange} previewUrl={eventBannerPreview} />
                {formData.eventImg && (
                  <p className="mt-2 text-xs font-bold text-success-600">Selected: {formData.eventImg.name}</p>
                )}
              </div>
            </div>
          </FormCard>
        )}

        {/* Navigation Actions */}
        <FormActions className="mt-6 rounded-xl">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="rounded-none px-8 font-bold  border-gray-200 text-gray-500 flex items-center gap-2"
            >
              <ChevronLeft size={16} strokeWidth={3} />
              Back
            </Button>
          )}
          <div className="ml-auto flex items-center gap-4">
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="rounded-none px-12 font-bold  shadow-xl shadow-brand-500/20 flex items-center gap-2"
              >
                Next Step
                <ChevronRight size={16} strokeWidth={3} />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={loading}
              className="rounded-none px-16 font-bold shadow-xl shadow-brand-500/30 bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all text-white"
              >
                {loading ? "Optimizing Assets..." : eventId ? "Update Event Profile" : "Create Event Profile"}
              </Button>
            )}
          </div>
        </FormActions>
      </form>

      {showSuccessPopup && (
        <SuccessPopup
          message={`Success! The event has been officially ${eventId ? 'updated' : 'listed'}. Athletes can now view and register for this tournament.`}
          onClose={() => {
            setShowSuccessPopup(false);
            navigate("/events");
          }}
        />
      )}
    </div>
  );
};

export default AddEventForm;
