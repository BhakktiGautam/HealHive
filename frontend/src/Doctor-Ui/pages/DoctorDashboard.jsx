import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Bell,
  MessageSquare,
  Video,
  Search,
  User,
  X,
  PhoneCall,
} from "lucide-react";
import Navbar from "../../Homepage/Navbar";
import Footer from "../../Homepage/footer";
import { useAuth } from "../../Context/AuthContext";

const statsTemplate = [
  { label: "Today's Appointments", key: "appointments", icon: Calendar },
  { label: "Total Patients", key: "patients", icon: Users },
  { label: "Pending Consultations", key: "pending", icon: Clock },
  { label: "Today's Earnings", key: "earnings", icon: IndianRupee },
];

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const DoctorDashboard = () => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    const fetchDoctorData = async () => {
      try {
        if (!user) {
          setError("Please log in to view your dashboard.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        const token = await user.getIdToken();
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/doctor/profile`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch doctor profile: ${res.status}`);
        }

        const data = await res.json();
        console.log("✅ Doctor data loaded:", data);
        const docData = data.doctor || data;
        setDoctor(docData);
        
        // Debug: log all interested patients
        console.log("📋 All interested patients:", docData.interestedPatients);
        
        // Show paid patients, but also show unpaid with a note for debugging
        const paidPatients = (docData.interestedPatients || []).filter(p => p.paid === true);
        console.log("💰 Paid patients:", paidPatients);
        console.log("⏳ Unpaid patients:", (docData.interestedPatients || []).filter(p => !p.paid));
        
        // Show ALL patients with payment status badges
        setAppointments(docData.interestedPatients || []);
      } catch (err) {
        console.error("❌ Error fetching doctor data:", err);
        setError(err.message || "Failed to load doctor data");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [user, authLoading]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <div className="text-slate-600 text-center">
            <p className="text-lg font-semibold">Loading your dashboard...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !doctor) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <div className="bg-white border border-emerald-100 rounded-2xl p-8 max-w-md text-center space-y-4">
            <p className="text-slate-700 font-semibold">{error || "No doctor data found"}</p>
            <p className="text-sm text-slate-600">Please complete your registration first.</p>
            <button
              onClick={() => window.location.href = "/doc"}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
            >
              Complete Registration
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const statsData = {
    appointments: appointments.length,
    patients: appointments.length,
    pending: appointments.length, // treat all as pending until accepted workflow exists
    earnings: `₹${(doctor.consultationFee || 0) * appointments.length}`,
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setEditData(prev => {
        const days = prev.availableDays.includes(value)
          ? prev.availableDays.filter(d => d !== value)
          : [...prev.availableDays, value];
        return { ...prev, availableDays: days };
      });
    } else {
      setEditData(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveProfile = () => {
    localStorage.setItem("doctorFormData", JSON.stringify(editData));
    setDoctor(editData);
    setOpenEdit(false);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
        <div className="max-w-7xl mx-auto space-y-10">

        {/* HEADER */}
        <div>
          <p className="text-emerald-600 font-semibold flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Doctor Dashboard
          </p>
          <h1 className="text-4xl font-extrabold text-slate-900">
            Welcome, Dr. {doctor.fullName} 👋
          </h1>
          <p className="text-slate-600 mt-1">
            {doctor.specialty || "N/A"} • {doctor.experience || 0} yrs experience
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsTemplate.map((s, i) => (
            <StatCard
              key={i}
              icon={s.icon}
              label={s.label}
              value={statsData[s.key]}
            />
          ))}
        </div>

        {/* APPOINTMENTS */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Patients who chose you
          </h2>

          <div className="space-y-3">
            {appointments.length === 0 && (
              <p className="text-slate-500">No paid consultations yet. Once someone pays, they will appear here.</p>
            )}
            {appointments.map((a, idx) => {
              // Check payment status and 24h window
              const isPaid = a.paid === true;
              const now = new Date();
              const paidAt = a.paidAt ? new Date(a.paidAt) : new Date(a.addedAt);
              const hoursSince = (now - paidAt) / (1000 * 60 * 60);
              const active = isPaid && hoursSince <= 24;
              
              return (
                <div
                  key={idx}
                  className={`flex flex-col md:flex-row md:justify-between md:items-center p-4 rounded-xl border gap-3 ${
                    active
                      ? "bg-emerald-50 border-emerald-200"
                      : isPaid
                      ? "bg-slate-50 border-slate-200 opacity-60"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{a.name || "Patient"}</p>
                    <p className="text-sm text-slate-500">{a.email || ""}</p>
                    {a.slotTime && <p className="text-xs text-slate-400">Slot: {a.slotTime}</p>}
                    {a.consultationId && <p className="text-xs text-slate-400">ID: {a.consultationId.slice(0, 8)}...</p>}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {!isPaid ? (
                      <span className="text-sm font-medium text-amber-600">Payment Pending</span>
                    ) : active ? (
                      <>
                        <span className="text-xs text-slate-500">{(24 - hoursSince).toFixed(0)}h left</span>
                        <div className="flex gap-2">
                          {/* Chat button */}
                          <button
                            onClick={() => navigate(`/chat/${a.consultationId}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition text-sm font-semibold"
                            title="Open Chat"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Chat
                          </button>
                          {/* Video call button */}
                          <button
                            onClick={() =>
                              navigate(`/call-room/${a.consultationId}`, {
                                state: {
                                  doctor: {
                                    name: doctor?.fullName ? `Dr. ${doctor.fullName}` : "Doctor",
                                    specialty: doctor?.specialty || "General Medicine",
                                  },
                                  slot: a.slotTime || "",
                                  paid: true,
                                  patientName: a.name || "Patient",
                                },
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition text-sm font-semibold"
                            title="Join Video Call"
                          >
                            <PhoneCall className="h-4 w-4" />
                            Join Call
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-slate-500">Expired</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PROFILE */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 max-w-md">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            Doctor Profile
          </h2>

          <div className="space-y-1 text-sm text-slate-700">
            <p><b>Email:</b> {doctor.email || "N/A"}</p>
            <p><b>Phone:</b> {doctor.phone || "N/A"}</p>
            <p><b>Gender:</b> {doctor.gender || "N/A"}</p>
            <p><b>Qualification:</b> {doctor.qualification || "N/A"}</p>
           <p>
  <b>Languages:</b>{" "}
  {Array.isArray(doctor.languages) 
    ? doctor.languages.join(", ") 
    : (doctor.languages ? doctor.languages : "N/A")}
</p>

            <p><b>Fees:</b> ₹{doctor.consultationFee || 0}</p>
            <p>
              <b>Availability:</b>{" "}
              {(doctor.availableDays ?? []).join(", ")} ({doctor.availableTimeSlots || "N/A"})
            </p>
          </div>

          <button
            onClick={() => { setOpenEdit(true); setEditData(doctor); }}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white"
          >
            Edit Profile
          </button>
        </div>

        {/* EDIT PROFILE MODAL */}
        {openEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative space-y-4">
            <button
              onClick={() => setOpenEdit(false)}
              className="absolute top-4 right-4"
            >
              <X />
            </button>
            <h2 className="text-xl font-bold mb-2">Edit Profile</h2>

            <div className="space-y-3 text-sm">
              <input
                type="text"
                name="fullName"
                value={editData.fullName}
                onChange={handleEditChange}
                placeholder="Full Name"
                className="w-full px-3 py-2 border rounded-xl"
              />
              <input
                type="email"
                name="email"
                value={editData.email}
                onChange={handleEditChange}
                placeholder="Email"
                className="w-full px-3 py-2 border rounded-xl"
              />
              <input
                type="tel"
                name="phone"
                value={editData.phone}
                onChange={handleEditChange}
                placeholder="Phone"
                className="w-full px-3 py-2 border rounded-xl"
              />
              <input
                type="text"
                name="qualification"
                value={editData.qualification}
                onChange={handleEditChange}
                placeholder="Qualification"
                className="w-full px-3 py-2 border rounded-xl"
              />
              <input
                type="number"
                name="consultationFee"
                value={editData.consultationFee}
                onChange={handleEditChange}
                placeholder="Consultation Fee"
                className="w-full px-3 py-2 border rounded-xl"
              />
              <input
                type="text"
                name="availableTimeSlots"
                value={editData.availableTimeSlots}
                onChange={handleEditChange}
                placeholder="Available Time Slots"
                className="w-full px-3 py-2 border rounded-xl"
              />
              <div className="flex flex-wrap gap-2">
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => (
                  <label key={day} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      value={day}
                      checked={editData.availableDays.includes(day)}
                      onChange={handleEditChange}
                      className="w-4 h-4"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={saveProfile}
              className="mt-4 w-full bg-emerald-600 text-white py-2 rounded-xl"
            >
              Save Changes
            </button>
          </div>
        </div>
        )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DoctorDashboard;
