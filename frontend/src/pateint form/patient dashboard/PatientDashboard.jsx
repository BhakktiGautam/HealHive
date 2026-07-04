import { useState, useEffect } from "react";
import { useAuth } from "../../Context/AuthContext";
import { MedicalReportUpload } from "../MedicalReportUpload";

import {
  UserCircle,
  Stethoscope,
  Activity,
  Heart,
  FileText,
  File,
  ShieldCheck,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Pill,
  BadgeCheck,
  Edit,
  Save,
  X,
} from "lucide-react";
import Navbar from "../../Homepage/Navbar";
import Footer from "../../Homepage/footer";

// Default empty patient structure
const samplePatient = {
  name: "",
  age: "",
  gender: "",
  bloodGroup: "",
  email: "",
  phone: "",
  location: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  primaryCondition: "",
  selectedDisease: "",
  otherDisease: "",
  specialty: "",
  symptoms: [],
  allergies: [],
  currentMedications: [],
  emergencyName: "",
  emergencyContact: "",
  status: "Pending",
  testReports: [],
  medicalDocuments: [],
};

const Badge = ({ label, tone = "emerald" }) => {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${toneClass}`}>
      <ShieldCheck className="h-4 w-4" />
      {label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, helper }) => (
  <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
    {helper && <p className="text-xs text-slate-500">{helper}</p>}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between text-sm text-slate-700">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-900">{value || "—"}</span>
  </div>
);

const PatientDashboard = ({ patient = samplePatient }) => {
  const { user, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [patientData, setPatientData] = useState(patient);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Fetch patient data on mount
  useEffect(() => {
    if (authLoading) return;

    const fetchPatientData = async () => {
      try {
        if (!user) {
          console.log("❌ No user logged in");
          setLoading(false);
          return;
        }

        setLoading(true);
        console.log("✅ User logged in:", user.email);
        const token = await user.getIdToken();
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        console.log("🔗 Fetching from:", `${backendUrl}/api/patient/get`);

        const response = await fetch(
          `${backendUrl}/api/patient/get`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("📡 Response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("📦 Received data:", data);
          
          // Map backend fields to frontend display names
          const mappedData = {
            ...samplePatient,
            name: data.fullName || "",
            age: data.age || "",
            gender: data.gender || "",
            bloodGroup: data.bloodGroup || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            pincode: data.pincode || "",
            primaryCondition: data.selectedDisease || "",
            selectedDisease: data.selectedDisease || "",
            otherDisease: data.otherDisease || "",
            specialty: data.specialty || "",
            symptoms: Array.isArray(data.symptoms) 
              ? data.symptoms 
              : (typeof data.symptoms === 'string' && data.symptoms.trim() 
                  ? data.symptoms.split(',').map(s => s.trim()).filter(s => s) 
                  : []),
            allergies: Array.isArray(data.allergies) 
              ? data.allergies 
              : (typeof data.allergies === 'string' && data.allergies.trim() 
                  ? data.allergies.split(',').map(s => s.trim()).filter(s => s) 
                  : []),
            currentMedications: Array.isArray(data.currentMedications) 
              ? data.currentMedications 
              : (typeof data.currentMedications === 'string' && data.currentMedications.trim() 
                  ? data.currentMedications.split(',').map(s => s.trim()).filter(s => s) 
                  : []),
            emergencyName: data.emergencyName || "",
            emergencyContact: data.emergencyContact || "",
            medicalDocuments: data.medicalDocuments || [],
          };
          
          console.log("🗺️ Mapped data:", mappedData);
          setPatientData(mappedData);
        } else {
          const errorText = await response.text();
          console.error("❌ Error response:", errorText);
        }
      } catch (err) {
        console.error("❌ Failed to fetch patient data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [user, authLoading]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/patient/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            bloodGroup: patientData.bloodGroup,
            email: patientData.email,
            phone: patientData.phone,
            address: patientData.address,
            city: patientData.city,
            state: patientData.state,
            pincode: patientData.pincode,
            selectedDisease: patientData.selectedDisease,
            otherDisease: patientData.otherDisease,
            specialty: patientData.specialty,
            symptoms: patientData.symptoms,
            allergies: patientData.allergies,
            currentMedications: patientData.currentMedications,
            emergencyName: patientData.emergencyName,
            emergencyContact: patientData.emergencyContact,
          }),
        }
      );

      if (response.ok) {
        setIsEditing(false);
        alert("Patient data updated successfully!");
      } else {
        alert("Failed to update patient data");
      }
    } catch (err) {
      console.error("Error saving patient data:", err);
      alert("Error saving patient data");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setPatientData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayChange = (field, index, value) => {
    setPatientData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleAddToArray = (field, value) => {
    setPatientData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), value],
    }));
  };

  const handleRemoveFromArray = (field, index) => {
    setPatientData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleReportUploaded = (newReport) => {
    setPatientData((prev) => ({
      ...prev,
      medicalDocuments: [...(prev.medicalDocuments || []), newReport],
    }));
  };

  const data = patientData;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 animate-spin mb-4">
              <div className="h-8 w-8 rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            </div>
            <p className="text-slate-600 font-medium">Loading your dashboard...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Check if user has no profile data yet
  const hasNoData = !patientData.name && !patientData.age && !patientData.phone;

  if (hasNoData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
              <UserCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Your Dashboard</h2>
            <p className="text-slate-600 mb-6">
              You haven't filled out your patient profile yet. Complete your profile to get started with consultations.
            </p>
            <a
              href="/patient-form"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition"
            >
              <Edit className="h-5 w-5" />
              Complete Your Profile
            </a>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4 sm:px-6 lg:px-10">
      {/* Background accents */}
      <div className="absolute -top-24 -left-24 h-72 w-72 bg-emerald-200/40 rounded-full blur-3xl" />
      <div className="absolute top-40 -right-24 h-72 w-72 bg-teal-200/40 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-700 font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4" /> Patient Dashboard
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-1">
              {data.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge label={data.status || "Active"} tone="emerald" />
              {data.primaryCondition && (
                <Badge label={data.primaryCondition} tone="amber" />
              )}
              {data.specialty && (
                <span className="text-sm text-slate-600 inline-flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-emerald-500" />
                  {data.specialty}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition"
              >
                <Edit className="h-5 w-5" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
                >
                  <Save className="h-5 w-5" />
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  <X className="h-5 w-5" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Top Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1 bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-2xl font-bold">
                {data.name?.[0] || "P"}
              </div>
              <div>
                <p className="text-sm text-slate-500">Patient</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="text-xl font-bold text-slate-900 border-b-2 border-emerald-300 focus:border-emerald-500 outline-none w-full"
                  />
                ) : (
                  <p className="text-xl font-bold text-slate-900">{data.name}</p>
                )}
                <p className="text-sm text-emerald-600 font-medium">{data.primaryCondition || "—"}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {isEditing ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Age</span>
                    <input
                      type="number"
                      value={data.age}
                      onChange={(e) => handleChange("age", e.target.value)}
                      className="font-medium text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none w-20 text-right"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Gender</span>
                    <select
                      value={data.gender}
                      onChange={(e) => handleChange("gender", e.target.value)}
                      className="font-medium text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Blood Group</span>
                    <select
                      value={data.bloodGroup}
                      onChange={(e) => handleChange("bloodGroup", e.target.value)}
                      className="font-medium text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Email</span>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="font-medium text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none flex-1 text-right"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Phone</span>
                    <input
                      type="tel"
                      value={data.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="font-medium text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none flex-1 text-right"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Location</span>
                    <input
                      type="text"
                      value={data.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                      className="font-medium text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none flex-1 text-right"
                    />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Age" value={data.age} />
                  <InfoRow label="Gender" value={data.gender} />
                  <InfoRow label="Blood Group" value={data.bloodGroup} />
                  <InfoRow label="Email" value={data.email} />
                  <InfoRow label="Phone" value={data.phone} />
                  <InfoRow label="Location" value={data.location} />
                </>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Condition */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Primary Condition</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.primaryCondition || ""}
                      onChange={(e) => handleChange("primaryCondition", e.target.value)}
                      className="text-lg font-semibold text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none w-full"
                      placeholder="Enter condition"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">{data.primaryCondition || "—"}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">Latest assessment</p>
            </div>

            {/* Assigned Doctor */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Assigned Doctor</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.doctor || ""}
                      onChange={(e) => handleChange("doctor", e.target.value)}
                      className="text-lg font-semibold text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none w-full"
                      placeholder="Enter doctor name"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">{data.doctor || "Not assigned"}</p>
                  )}
                </div>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={data.specialty || ""}
                  onChange={(e) => handleChange("specialty", e.target.value)}
                  className="text-xs text-slate-500 border-b border-emerald-300 focus:border-emerald-500 outline-none w-full"
                  placeholder="Enter specialty"
                />
              ) : (
                <p className="text-xs text-slate-500">{data.specialty ? `${data.specialty} Specialist` : ""}</p>
              )}
            </div>

            {/* Last Visit */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Last Visit</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={data.lastVisit || ""}
                      onChange={(e) => handleChange("lastVisit", e.target.value)}
                      className="text-lg font-semibold text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none w-full"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">{data.lastVisit || "—"}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">Previous consultation date</p>
            </div>

            {/* Next Follow-up */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Next Follow-up</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={data.nextFollowUp || ""}
                      onChange={(e) => handleChange("nextFollowUp", e.target.value)}
                      className="text-lg font-semibold text-slate-900 border-b border-emerald-300 focus:border-emerald-500 outline-none w-full"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">{data.nextFollowUp || "To be scheduled"}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">Suggested timeline</p>
            </div>
          </div>
        </div>

        {/* Middle Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Symptoms & Meds */}
          <div className="lg:col-span-2 bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">Symptoms & Notes</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {(data.symptoms || []).map((sym, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm"
                    >
                      {sym}
                    </span>
                  ))}
                  {(!data.symptoms || data.symptoms.length === 0) && (
                    <span className="text-sm text-slate-500">No symptoms listed.</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Current Medications</p>
                <div className="space-y-2">
                  {(data.currentMedications || []).map((med, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-slate-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"
                    >
                      <Pill className="h-4 w-4 text-emerald-500" /> {med}
                    </div>
                  ))}
                  {(!data.currentMedications || data.currentMedications.length === 0) && (
                    <span className="text-sm text-slate-500">No medications recorded.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">Care Team</h3>
            </div>
            <InfoRow label="Doctor" value={data.doctor || "Not assigned"} />
            <InfoRow label="Specialty" value={data.specialty || "—"} />
            <InfoRow label="Email" value={data.email || "—"} />
            <InfoRow label="Phone" value={data.phone || "—"} />
            <InfoRow label="Location" value={data.location || "—"} />
          </div>
        </div>

        {/* Test Reports & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports */}
          <div className="lg:col-span-2 bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <File className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">Uploaded Test Reports</h3>
            </div>
            
            <MedicalReportUpload onUploadSuccess={handleReportUploaded} />
            
            <div className="grid md:grid-cols-2 gap-4">
              {(data.medicalDocuments || []).map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50"
                >
                  <div className={`p-2 rounded-xl ${file.type === "pdf" ? "bg-red-100" : "bg-blue-100"}`}>
                    {file.type === "pdf" ? (
                      <FileText className="h-5 w-5 text-red-600" />
                    ) : (
                      <File className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{file.size} • {file.date}</p>
                  </div>
                  <button onClick={() => window.open(file.url, "_blank")}
                  className="text-emerald-600 text-xs font-semibold hover:underline">View</button>
                </div>
              ))}
              {(!data.medicalDocuments || data.medicalDocuments.length === 0) && (
                <p className="text-sm text-slate-500">No reports uploaded.</p>
              )}
            </div>
          </div>

          {/* History */}
          <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">Medical History</h3>
            </div>
            <div className="space-y-4">
              {(data.medicalHistory || []).map((event, idx) => (
                <div key={idx} className="relative pl-4 border-l border-emerald-200">
                  <span className="absolute -left-2 top-1 h-3 w-3 rounded-full bg-emerald-500" />
                  <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                  <p className="text-xs text-slate-500 mb-1">{event.date}</p>
                  <p className="text-sm text-slate-600">{event.note}</p>
                </div>
              ))}
              {(!data.medicalHistory || data.medicalHistory.length === 0) && (
                <p className="text-sm text-slate-500">No history recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
      <Footer />
    </>
  );
};

export default PatientDashboard;
