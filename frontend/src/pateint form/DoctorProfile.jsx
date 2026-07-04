import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  Award,
  CheckCircle,
  MessageCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Scheduling helpers ────────────────────────────────────────────────────────

/**
 * Returns the next 14 days (starting today) with availability metadata.
 * Sundays are always marked unavailable; 30 % of other days are randomly
 * unavailable (seeded by doctorId so the pattern is stable per doctor).
 */
const buildAvailableDates = (doctorId) => {
  const seededRand = (seed) => {
    // simple LCG for deterministic pseudo-random
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isSunday = d.getDay() === 0;
    const seedVal = (doctorId || 1) * 100 + i;
    const rand = seededRand(seedVal);
    const available = !isSunday && rand > 0.3;
    dates.push({ date: d, available });
  }
  return dates;
};

/**
 * Given a doctor's timeSlots array and a date, return the slots for that day.
 * Slots are rotated per day so each day has a slightly different set.
 */
const getSlotsForDate = (timeSlots, date) => {
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) return [];
  // Rotate the base slots by day-of-month to vary availability per day
  const offset = date.getDate() % timeSlots.length;
  return timeSlots.map((slot, idx) => ({
    ...slot,
    // slots near offset become unavailable on this specific date
    available: slot.available && (idx + offset) % 3 !== 0,
  }));
};

/** Formats a Date → "Mon, Jun 23" */
const formatDate = (date) =>
  date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

/** Formats a Date → "Monday" */
const formatDay = (date) =>
  date.toLocaleDateString("en-IN", { weekday: "long" });
// ──────────────────────────────────────────────────────────────────────────────
import Navbar from "../Homepage/Navbar";
import Footer from "../Homepage/footer";
import { getDoctorById, getStableRating, getStableReviews } from "../utils/doctorFilterService";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const DoctorProfile = () => {
  const { doctorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [consultationId, setConsultationId] = useState("");
  const [pendingConsultationId, setPendingConsultationId] = useState(""); // Store consultationId from create-intent
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [stripePromise, setStripePromise] = useState(null);

  // Get doctor from route state or fetch by ID
  const doctor = location.state?.doctor || getDoctorById(parseInt(doctorId));

  useEffect(() => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (key && typeof key === "string" && key.trim().length > 0) {
      setStripePromise(loadStripe(key));
    }
  }, []);

  // Check if patient has active consultation (within 24h)
  useEffect(() => {
    if (!user || !doctor) return;
    const checkStatus = async () => {
      try {
        // Check localStorage first
        const stored = localStorage.getItem(`consultation_${doctor.id}_${user.uid}`);
        if (stored) {
          const data = JSON.parse(stored);
          const token = await user.getIdToken();
          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/payments/status/${data.consultationId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const status = await res.json();
          if (status.active) {
            setHasPaid(true);
            setConsultationId(data.consultationId);
          } else {
            localStorage.removeItem(`consultation_${doctor.id}_${user.uid}`);
          }
        }
      } catch (e) {
        console.warn("Status check failed", e);
      }
    };
    checkStatus();
  }, [user, doctor]);

  useEffect(() => {
    if (!doctor) return;
    // If this is a registered doctor selection, record interest
    const recordSelection = async () => {
      try {
        if (!user || doctor.source !== "registered") return;
        const token = await user.getIdToken();
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/doctor/select/${doctor.id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("select doctor error", err);
      }
    };
    recordSelection();
  }, [doctor, user]);

  if (!doctor) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <div className="text-center">
            <p className="text-slate-600 text-lg">Doctor not found</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const handleBookConsultation = () => {
    if (!user) {
      alert("Please log in to continue.");
      navigate("/login");
      return;
    }
    if (!selectedSlot) {
      alert("Please select a time slot");
      return;
    }
    
    console.log("🏥 Booking consultation for doctor:", {
      doctorId: doctor.id,
      doctorName: doctor.name,
      source: doctor.source,
      slotTime: selectedSlot
    });
    
    // Inline payment modal (no page change)
    setShowPayment(true);
    const dateStr = selectedDate ? selectedDate.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";
    const slotFull = dateStr ? `${dateStr} at ${selectedSlot}` : selectedSlot;
    (async () => {
      try {
        const token = await user.getIdToken();
        const feeValue = typeof doctor.fee === "number"
          ? doctor.fee
          : parseInt(String(doctor.fee || "").replace(/[^0-9]/g, ""), 10) || 0;
        
        console.log("💳 Creating payment intent...", { doctorId: doctor.id, feeValue });
        
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payments/create-intent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            doctorId: doctor.source === "registered" ? doctor.id : doctor.id, // supports both
            doctorName: doctor.name,
            slotTime: slotFull,
            amount: feeValue * 100, // in paise for INR
            currency: "inr",
          }),
        });
        const data = await res.json();
        if (res.ok && data.clientSecret) {
          console.log("✅ Payment intent created:", data.consultationId);
          setPendingConsultationId(data.consultationId); // Store for later confirmation
          setClientSecret(data.clientSecret);
        } else {
          throw new Error(data.error || "Failed to init payment");
        }
      } catch (err) {
        console.error("❌ create-intent error", err);
        // Fallback to dummy flow for hackathon/dev
        try {
          const token = await user.getIdToken();
          const feeValue = typeof doctor.fee === "number"
            ? doctor.fee
            : parseInt(String(doctor.fee || "").replace(/[^0-9]/g, ""), 10) || 0;
          
          console.log("⚠️ Falling back to dummy payment...");
          const res2 = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payments/initiate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ doctorId: doctor.id, doctorName: doctor.name, slotTime: slotFull, fee: feeValue }),
          });
          const data2 = await res2.json();
          if (res2.ok && data2.consultationId) {
            console.log("✅ Dummy payment success:", data2.consultationId);
            setShowPayment(false);
            setHasPaid(true);
            setConsultationId(data2.consultationId);
            localStorage.setItem(
              `consultation_${doctor.id}_${user.uid}`,
              JSON.stringify({ consultationId: data2.consultationId, timestamp: Date.now() })
            );
          } else {
            alert("Unable to start payment. Please try again.");
            setShowPayment(false);
          }
        } catch (e2) {
          alert("Unable to start payment. Please try again.");
          setShowPayment(false);
        }
      }
    })();
  };

  // Stable doctor additional details
  const doctorDetails = {
    rating: doctor.rating || getStableRating(doctor),
    reviews: doctor.reviews || getStableReviews(doctor),
    isOnline: typeof doctor.isOnline === "boolean" ? doctor.isOnline : Math.random() > 0.4,
    location: doctor.location || ["New Delhi", "Mumbai", "Bangalore"][Math.floor(Math.random() * 3)],
    about: `Dr. ${doctor.name} is a highly experienced ${doctor.specialty} specialist with over ${doctor.experience || 10} years of practice. Known for compassionate care and accurate diagnosis, Dr. ${doctor.name} has helped thousands of patients achieve better health outcomes.`,
    education: ["MBBS - Delhi University", "MD - Cardiology - AIIMS Delhi"],
    achievements: [
      "Best Doctor Award 2022",
      "Patient Choice Award 2023",
      "Medical Excellence Certificate",
    ],
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
        {/* Background gradients */}
        <div className="absolute -top-24 -left-24 h-96 w-96 bg-emerald-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 -right-24 h-96 w-96 bg-teal-200/40 rounded-full blur-3xl animate-pulse delay-200" />

        <div className="relative max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Doctor Header Card */}
              <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden animate-fadeUp">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-32" />

                <div className="p-8 -mt-16 relative">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                      <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg mb-4">
                        {doctor.name.charAt(0)}
                      </div>

                      <h1 className="text-3xl font-extrabold text-slate-900">Dr. {doctor.name}</h1>
                      <p className="text-lg font-semibold text-emerald-600 mt-1">{doctor.specialty}</p>

                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-slate-900">
                            {doctorDetails.rating}
                          </span>
                          <span className="text-slate-600 text-sm">
                            ({doctorDetails.reviews} reviews)
                          </span>
                        </div>
                        <span
                          className={`h-3 w-3 rounded-full ${
                            doctorDetails.isOnline ? "bg-green-500" : "bg-slate-300"
                          }`}
                        />
                        <span className="text-sm font-medium text-slate-600">
                          {doctorDetails.isOnline ? "Online Now" : "Offline"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="text-center bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                        <p className="text-xs text-slate-600 uppercase tracking-wide">
                          Consultation Fee
                        </p>
                        <p className="text-3xl font-bold text-emerald-600">{doctor.fee}</p>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center justify-end gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {doctorDetails.location}
                      </p>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <Award className="h-4 w-4 text-emerald-600 mb-1" />
                      <p className="text-xs font-semibold text-slate-900">
                        {doctor.experience || 10}+ Years
                      </p>
                      <p className="text-xs text-slate-600">Experience</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <Users className="h-4 w-4 text-emerald-600 mb-1" />
                      <p className="text-xs font-semibold text-slate-900">{doctorDetails.reviews}+</p>
                      <p className="text-xs text-slate-600">Patients</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <Clock className="h-4 w-4 text-emerald-600 mb-1" />
                      <p className="text-xs font-semibold text-slate-900">30 mins</p>
                      <p className="text-xs text-slate-600">Session</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mb-1" />
                      <p className="text-xs font-semibold text-slate-900">Verified</p>
                      <p className="text-xs text-slate-600">Licensed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-8 animate-fadeUp">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">About</h2>
                <p className="text-slate-700 leading-relaxed">{doctorDetails.about}</p>
              </div>

              {/* Education & Achievements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fadeUp">
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-600" /> Education
                  </h3>
                  <ul className="space-y-3">
                    {doctorDetails.education.map((edu, idx) => (
                      <li key={idx} className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{edu}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" /> Achievements
                  </h3>
                  <ul className="space-y-3">
                    {doctorDetails.achievements.map((achievement, idx) => (
                      <li key={idx} className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Languages */}
              <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 animate-fadeUp">
                <h3 className="font-bold text-slate-900 mb-4">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {(doctor.languages || "English, Hindi").split(",").map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm border border-emerald-200"
                    >
                      {lang.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - Booking */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 sticky top-20 animate-fadeUp">
                <h3 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" /> Book Appointment
                </h3>

                {/* ── Calendar ── */}
                <AppointmentCalendar
                  doctorId={doctor.id}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null); // reset slot when date changes
                  }}
                />

                {/* ── Time Slots for selected date ── */}
                {selectedDate && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      Available slots for{" "}
                      <span className="text-emerald-700">{formatDate(selectedDate)}</span>
                    </p>
                    <TimeSlotPicker
                      timeSlots={doctor.timeSlots}
                      selectedDate={selectedDate}
                      selectedSlot={selectedSlot}
                      onSelectSlot={setSelectedSlot}
                    />
                  </div>
                )}

                {/* ── Booking summary ── */}
                {selectedDate && selectedSlot && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Your Appointment</p>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-900">
                        {formatDay(selectedDate)}, {formatDate(selectedDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-900">{selectedSlot}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBookConsultation}
                  disabled={!selectedSlot || !selectedDate}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition mt-4 ${
                    selectedSlot && selectedDate
                      ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white hover:shadow-lg"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {hasPaid ? "Payment Completed" : "Continue to Payment"}
                </button>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <button
                    onClick={() => navigate(`/chat/${consultationId}`)}
                    disabled={!hasPaid}
                    className={`w-full py-3 rounded-xl font-semibold border-2 flex items-center justify-center gap-2 transition ${
                      hasPaid
                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        : "border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" /> {hasPaid ? "Message Doctor" : "Pay to Message"}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/call-room/${consultationId}`, { state: { doctor, slot: selectedSlot, paid: true } })}
                      disabled={!hasPaid}
                      className={`flex-1 py-3 rounded-xl font-semibold border-2 transition ${
                        hasPaid
                          ? "border-teal-200 text-teal-700 hover:bg-teal-50"
                          : "border-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      Voice Call
                    </button>
                    <button
                      onClick={() => navigate(`/call-room/${consultationId}`, { state: { doctor, slot: selectedSlot, paid: true } })}
                      disabled={!hasPaid}
                      className={`flex-1 py-3 rounded-xl font-semibold border-2 transition ${
                        hasPaid
                          ? "border-green-200 text-green-700 hover:bg-green-50"
                          : "border-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      Video Call
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-slate-700">+91 9876543210</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-slate-700 truncate">doctor@healhive.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showPayment && clientSecret && stripePromise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Secure Payment</h3>
              <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-slate-100 rounded-lg">✕</button>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <InlinePaymentForm
                doctor={doctor}
                selectedSlot={selectedSlot}
                pendingConsultationId={pendingConsultationId}
                user={user}
                onSuccess={async (cid) => {
                  console.log("✅ Payment succeeded, consultationId:", cid);
                  setShowPayment(false);
                  setHasPaid(true);
                  setConsultationId(cid);
                  // Persist consultation for 24h
                  localStorage.setItem(
                    `consultation_${doctor.id}_${user.uid}`,
                    JSON.stringify({ consultationId: cid, timestamp: Date.now() })
                  );
                  console.log("💾 Saved to localStorage:", `consultation_${doctor.id}_${user.uid}`);
                  
                  // Mark paid on backend (always confirm for doctors in database)
                  try {
                    console.log("📝 Confirming payment with backend...", { doctorId: doctor.id, consultationId: cid });
                    const token = await user.getIdToken();
                    const confirmRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payments/confirm`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ doctorId: doctor.id, consultationId: cid }),
                    });
                    
                    if (confirmRes.ok) {
                      console.log("✅ Payment confirmed on backend");
                    } else {
                      const errorData = await confirmRes.json();
                      console.error("❌ Payment confirmation failed:", errorData);
                    }
                  } catch (e) {
                    console.error("❌ confirm payment error:", e?.message);
                  }
                }}
                onCancel={() => setShowPayment(false)}
              />
            </Elements>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

// Inline Stripe Payment form component
const InlinePaymentForm = ({ doctor, selectedSlot, pendingConsultationId, user, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required", // keep inline
      });
      if (error) {
        setErrorMsg(error.message || "Payment failed");
        setSubmitting(false);
        return;
      }
      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Use the consultationId from create-intent response, not metadata
        const consultationId = pendingConsultationId || paymentIntent.metadata?.consultationId || `CONS_${Date.now()}`;
        console.log("💰 Payment succeeded! Using consultationId:", consultationId);
        onSuccess?.(consultationId);
      } else {
        setErrorMsg("Payment not completed");
      }
    } catch (err) {
      setErrorMsg(err?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMsg && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{errorMsg}</div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded border border-slate-200 text-slate-700">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 py-2 rounded bg-emerald-600 text-white font-semibold disabled:opacity-50">
          {submitting ? "Processing..." : `Pay ${doctor.fee}`}
        </button>
      </div>
      <p className="text-xs text-slate-500">You will return here automatically after payment.</p>
    </form>
  );
};

// ─── AppointmentCalendar ───────────────────────────────────────────────────────
const AppointmentCalendar = ({ doctorId, selectedDate, onSelectDate }) => {
  const availableDates = useMemo(() => buildAvailableDates(doctorId), [doctorId]);

  // Week-based pagination: show 7 days per page
  const [weekOffset, setWeekOffset] = useState(0);
  const startIdx = weekOffset * 7;
  const visibleDates = availableDates.slice(startIdx, startIdx + 7);
  const canPrev = weekOffset > 0;
  const canNext = startIdx + 7 < availableDates.length;

  const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine the month/year label for the current week view
  const firstVisible = visibleDates[0]?.date;
  const monthLabel = firstVisible
    ? firstVisible.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "";

  return (
    <div>
      {/* Month + navigation */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700">{monthLabel}</span>
        <div className="flex gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            disabled={!canPrev}
            className={`p-1 rounded-lg transition ${
              canPrev ? "hover:bg-emerald-50 text-emerald-700" : "text-slate-300 cursor-not-allowed"
            }`}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            disabled={!canNext}
            className={`p-1 rounded-lg transition ${
              canNext ? "hover:bg-emerald-50 text-emerald-700" : "text-slate-300 cursor-not-allowed"
            }`}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {visibleDates.map(({ date }) => (
          <div key={date.toISOString()} className="text-center text-xs text-slate-400 font-medium">
            {DAY_LABELS[date.getDay()]}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-1">
        {visibleDates.map(({ date, available }) => {
          const isToday = date.getTime() === today.getTime();
          const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
          return (
            <button
              key={date.toISOString()}
              disabled={!available}
              onClick={() => onSelectDate(date)}
              title={!available ? "Unavailable" : formatDate(date)}
              className={[
                "flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition select-none",
                isSelected
                  ? "bg-emerald-600 text-white shadow-md"
                  : available
                  ? isToday
                    ? "bg-emerald-50 border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                    : "bg-white border border-emerald-200 text-slate-800 hover:border-emerald-400 hover:bg-emerald-50"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200",
              ].join(" ")}
            >
              <span>{date.getDate()}</span>
              {isToday && !isSelected && (
                <span className="text-[9px] text-emerald-600 leading-none">Today</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── TimeSlotPicker ───────────────────────────────────────────────────────────
const TimeSlotPicker = ({ timeSlots, selectedDate, selectedSlot, onSelectSlot }) => {
  const slots = useMemo(
    () => (selectedDate ? getSlotsForDate(timeSlots, selectedDate) : []),
    [timeSlots, selectedDate]
  );

  if (!slots || slots.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-3 bg-slate-50 rounded-xl border border-slate-200">
        No slots available for this day
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot, idx) => {
        const isSelected = selectedSlot === slot.time;
        return (
          <button
            key={idx}
            disabled={!slot.available}
            onClick={() => onSelectSlot(slot.time)}
            className={[
              "py-2.5 rounded-xl text-sm font-semibold border-2 transition flex items-center justify-center gap-1",
              slot.available
                ? isSelected
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-emerald-200 text-slate-800 hover:border-emerald-400"
                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            {slot.time}
            {!slot.available && <span className="text-[10px]">(Booked)</span>}
            {isSelected && slot.available && <CheckCircle className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

export default DoctorProfile;
