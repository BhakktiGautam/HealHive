import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.jsx";
import { filterDoctors } from "../utils/doctorFilterService.js";
import Navbar from "../Homepage/Navbar";
import Footer from "../Homepage/footer";
import useFormValidation from '../hooks/useFormValidation';
import FormInput from '../components/FormInput';
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  AlertCircle,
  Heart,
  CreditCard,
  CheckCircle,
  UserCircle,
} from "lucide-react";

const commonDiseases = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Heart Disease",
  "Arthritis",
  "Thyroid Disorder",
  "Kidney Disease",
  "Liver Disease",
  "COPD",
  "Cancer",
  "Migraine",
  "Depression",
  "Anxiety",
  "Other",
];

const specialties = [
  "General Medicine",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Ophthalmology",
  "Gynecology",
  "Pediatrics",
  "Dermatology",
  "ENT",
  "Psychiatry",
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const initialFormData = {
  fullName: "",
  age: "",
  gender: "",
  bloodGroup: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  emergencyContact: "",
  emergencyName: "",
  selectedDisease: "",
  otherDisease: "",
  allergies: "",
  currentMedications: "",
  symptoms: "",
  specialty: "",
  preferredDate: "",
  preferredTime: "",
  additionalNotes: "",
};

const validationRules = {
  fullName: [
    (value) => !value || value.trim().length < 2 ? 'Name must be at least 2 characters' : '',
    (value) => value && value.trim().length > 50 ? 'Name must be less than 50 characters' : '',
  ],
  email: [
    (value) => !value ? 'Email is required' : '',
    (value) => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email address' : '',
  ],
  phone: [
    (value) => !value ? 'Phone number is required' : '',
    (value) => value && !/^[6-9]\d{9}$/.test(value) ? 'Enter a valid 10-digit mobile number' : '',
  ],
  age: [
    (value) => !value ? 'Age is required' : '',
    (value) => value && (parseInt(value) < 1 || parseInt(value) > 120) ? 'Age must be between 1 and 120' : '',
  ],
  gender: [
    (value) => !value ? 'Please select your gender' : '',
  ],
  selectedDisease: [
    (value) => !value ? 'Please select a medical condition' : '',
  ],
  symptoms: [
    (value) => !value || value.trim().length < 10 ? 'Please describe your symptoms in detail (min 10 characters)' : '',
  ],
  preferredDate: [
    (value) => !value ? 'Please select a date' : '',
  ],
  preferredTime: [
    (value) => !value ? 'Please select a time' : '',
  ],
};

const PatientForm = () => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initialize validation hook
  const {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
  } = useFormValidation(initialFormData, validationRules);

  // Auto-fill email for logged-in user
  useEffect(() => {
    if (user?.email) {
      setFieldValue('email', user.email);
    }
  }, [user, setFieldValue]);

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Custom change handler for select and textarea
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    if (name === "age" && value?.toString().length > 3) {
      value = value.toString().slice(0, 3);
    }

    handleChange(e);
  };

  // Validate current step
  const validateStep = (currentStep) => {
    const stepFields = {
      1: ['fullName', 'age', 'gender', 'email', 'phone'],
      2: ['selectedDisease', 'symptoms'],
      3: ['preferredDate', 'preferredTime'],
    };

    const fieldsToValidate = stepFields[currentStep] || [];
    let stepIsValid = true;

    fieldsToValidate.forEach((field) => {
      // Manually trigger validation for each field
      const event = {
        target: { name: field, value: values[field] }
      };
      handleBlur(event);
      
      if (errors[field]) {
        stepIsValid = false;
      }
    });

    return stepIsValid;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setStep((prev) => prev - 1);
  };

  // Save data without navigating
  const handleSaveOnly = async () => {
    if (!validateStep(step)) return;

    if (!user) {
      alert("Please log in to save your information.");
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      const token = await user.getIdToken();

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/patient/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(values),
        }
      );

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(
          `Failed to save patient data: ${res.status} ${res.statusText}. ${errorBody.slice(0, 100)}`
        );
      }

      const data = await res.json();
      console.log("✅ Patient data saved:", data);
      alert("✅ Your information has been saved successfully! You can view it in My Dashboard.");
      setFormSubmitted(true);
    } catch (err) {
      console.error("❌ Error:", err);
      alert(`Error saving patient data: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Save data and navigate to available doctors
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const allErrors = {};
    Object.keys(validationRules).forEach((field) => {
      const event = { target: { name: field, value: values[field] } };
      handleBlur(event);
      if (errors[field]) {
        allErrors[field] = errors[field];
      }
    });

    if (Object.keys(allErrors).length > 0) {
      alert("Please fix all errors before submitting.");
      return;
    }

    if (!user) {
      alert("Please log in to continue.");
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      const token = await user.getIdToken();

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/patient/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(values),
        }
      );

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(
          `Failed to save patient data: ${res.status} ${res.statusText}. ${errorBody.slice(0, 100)}`
        );
      }

      const data = await res.json();
      console.log("✅ Patient data saved:", data);

      const { doctors: filteredDoctors, usedFallback, targetSpecialty } = filterDoctors(
        values.selectedDisease,
        values.specialty
      );

      navigate("/available-doctors", {
        state: {
          doctors: filteredDoctors,
          usedFallback: usedFallback,
          targetSpecialty: targetSpecialty,
          selectedDisease: values.selectedDisease || "General Consultation",
        },
      });
    } catch (err) {
      console.error("❌ Error:", err);
      alert(`Error saving patient data: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Check if a field has errors
  const hasError = (fieldName) => {
    return touched[fieldName] && errors[fieldName];
  };

  // Get error message for a field
  const getError = (fieldName) => {
    return touched[fieldName] ? errors[fieldName] : '';
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute -top-24 -left-24 h-96 w-96 bg-emerald-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 -right-24 h-96 w-96 bg-teal-200/40 rounded-full blur-3xl animate-pulse delay-200" />

        <div className="relative max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-11 animate-fadeUp">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Stethoscope className="h-8 w-8 text-emerald-600" />
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
                Patient Registration
              </h1>
            </div>
            <p className="text-slate-600">
              Fill in your details to book a telehealth consultation
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { num: 1, label: "Personal Info", icon: User },
                { num: 2, label: "Medical Info", icon: Heart },
              ].map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={s.num} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all ${
                          step >= s.num
                            ? "bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-500 text-white"
                            : "bg-white border-slate-300 text-slate-400"
                        }`}
                      >
                        {step > s.num ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium ${
                          step >= s.num ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < 1 && (
                      <div
                        className={`h-0.5 w-12 md:w-24 mx-2 transition-all ${
                          step > s.num ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 md:p-12">
            <form onSubmit={handleFormSubmit}>
              {/* Step 1: Personal Information */}
              {step === 1 && (
                <div className="space-y-6 animate-fadeUp">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <UserCircle className="h-6 w-6 text-emerald-600" />
                    Personal Information
                  </h2>

                  <FormInput
                    label="Full Name"
                    name="fullName"
                    value={values.fullName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    error={getError('fullName')}
                    touched={touched.fullName}
                    required
                    placeholder="Enter your full name"
                    icon={<User className="h-5 w-5 text-emerald-400" />}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormInput
                      label="Age"
                      name="age"
                      type="number"
                      value={values.age}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      error={getError('age')}
                      touched={touched.age}
                      required
                      placeholder="Age"
                      min="1"
                      max="120"
                    />

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={values.gender}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          hasError('gender')
                            ? "border-red-300 focus:ring-red-200 bg-red-50"
                            : touched.gender && values.gender
                              ? "border-green-500 focus:ring-green-200 bg-green-50"
                              : "border-emerald-200 focus:ring-emerald-200"
                        } focus:ring-2 outline-none transition`}
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {hasError('gender') && (
                        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.gender}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Blood Group
                      </label>
                      <select
                        name="bloodGroup"
                        value={values.bloodGroup}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                      >
                        <option value="">Select</option>
                        {bloodGroups.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="Email Address"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      error={getError('email')}
                      touched={touched.email}
                      required
                      placeholder="your@email.com"
                      disabled={!!user?.email}
                      icon={<Mail className="h-5 w-5 text-emerald-400" />}
                    />

                    <FormInput
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      value={values.phone}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      error={getError('phone')}
                      touched={touched.phone}
                      required
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      icon={<Phone className="h-5 w-5 text-emerald-400" />}
                    />
                  </div>

                  <FormInput
                    label="Address"
                    name="address"
                    value={values.address}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Street address"
                    icon={<MapPin className="h-5 w-5 text-emerald-400" />}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormInput
                      label="City"
                      name="city"
                      value={values.city}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="City"
                    />

                    <FormInput
                      label="State"
                      name="state"
                      value={values.state}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="State"
                    />

                    <FormInput
                      label="Pincode"
                      name="pincode"
                      value={values.pincode}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="6-digit pincode"
                      maxLength="6"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="Emergency Contact Name"
                      name="emergencyName"
                      value={values.emergencyName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Contact person name"
                    />

                    <FormInput
                      label="Emergency Contact Number"
                      name="emergencyContact"
                      type="tel"
                      value={values.emergencyContact}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="10-digit number"
                      maxLength="10"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Medical Information */}
              {step === 2 && (
                <div className="space-y-6 animate-fadeUp">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <Heart className="h-6 w-6 text-emerald-600" />
                    Medical Information
                  </h2>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Medical Condition / Disease <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="selectedDisease"
                      value={values.selectedDisease}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        hasError('selectedDisease')
                          ? "border-red-300 focus:ring-red-200 bg-red-50"
                          : touched.selectedDisease && values.selectedDisease
                            ? "border-green-500 focus:ring-green-200 bg-green-50"
                            : "border-emerald-200 focus:ring-emerald-200"
                      } focus:ring-2 outline-none transition`}
                    >
                      <option value="">Select a condition</option>
                      {commonDiseases.map((disease) => (
                        <option key={disease} value={disease}>
                          {disease}
                        </option>
                      ))}
                    </select>
                    {hasError('selectedDisease') && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.selectedDisease}
                      </p>
                    )}
                  </div>

                  {values.selectedDisease === "Other" && (
                    <FormInput
                      label="Please Specify"
                      name="otherDisease"
                      value={values.otherDisease}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      required
                      placeholder="Describe your condition"
                    />
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Current Symptoms <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="symptoms"
                      value={values.symptoms}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      rows="4"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        hasError('symptoms')
                          ? "border-red-300 focus:ring-red-200 bg-red-50"
                          : touched.symptoms && values.symptoms && values.symptoms.length >= 10
                            ? "border-green-500 focus:ring-green-200 bg-green-50"
                            : "border-emerald-200 focus:ring-emerald-200"
                      } focus:ring-2 outline-none transition resize-none`}
                      placeholder="Describe your current symptoms in detail..."
                    />
                    {hasError('symptoms') && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.symptoms}
                      </p>
                    )}
                    {touched.symptoms && !errors.symptoms && values.symptoms && (
                      <p className="mt-1 text-sm text-green-500 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Symptoms documented
                      </p>
                    )}
                  </div>

                  <FormInput
                    label="Known Allergies"
                    name="allergies"
                    value={values.allergies}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g., Penicillin, Peanuts, Latex (or 'None')"
                  />

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Current Medications
                    </label>
                    <textarea
                      name="currentMedications"
                      value={values.currentMedications}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-200 outline-none transition resize-none"
                      placeholder="List any medications you're currently taking..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Medical Specialty <span className="text-slate-500 font-normal">(If you want or specifically need)</span>
                    </label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-3.5 h-5 w-5 text-emerald-400" />
                      <select
                        name="specialty"
                        value={values.specialty}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                      >
                        <option value="">Choose specialty (optional)</option>
                        {specialties.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10 pt-6 border-t border-slate-200">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-6 py-3 rounded-xl border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition"
                  >
                    Previous
                  </button>
                )}

                {step < 2 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="ml-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition"
                  >
                    Next Step →
                  </button>
                ) : (
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveOnly}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-semibold hover:bg-emerald-50 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Stethoscope className="h-5 w-5" />
                      {saving ? "Processing..." : "Find Doctors"}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              HIPAA Compliant
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              End-to-End Encrypted
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Secure Payment Gateway
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PatientForm;