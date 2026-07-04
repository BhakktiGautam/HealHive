import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  ShieldCheck,
  HeartPulse,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export default function Footer() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleConsultNow = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const token = await user.getIdToken();

    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data.role === "patient" && data.profileCompleted === false) {
      navigate("/doctor-profile");
    } else {
      navigate("/available-doctors");
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 px-6 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white text-xl font-bold">
              <HeartPulse className="text-emerald-401" />
              HealHive
            </div>
            <p className="text-sm text-slate-400">
              A secure telehealth platform enabling a instant medical
              consultations from anywhere with privacy-first technology.
            </p>

            <div className="flex items-center gap-3 text-sm text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              PHI-Secure & Privacy-First
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-emerald-400">Home</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-emerald-400">How It Works</Link></li>
 
              <li><Link to="/#specialties" className="hover:text-emerald-400">Specialties</Link></li>
              <li>
  <button onClick={handleConsultNow} className="hover:text-emerald-400">
    Consult Now
  </button>
</li>

              <li><Link to="/specialties" className="hover:text-emerald-400">Specialties</Link></li>
              <li><Link to="/doctor-profile" className="hover:text-emerald-400">Consult Now</Link></li>

            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-3 text-sm">
              <li>Video Consultation</li>
              <li>Real-Time Chat</li>
              <li>AI Transcription</li>
              <li>Secure Payments</li>
              <li>Health Records</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-emerald-400" />
                +91 9XXXXXXXXX
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-emerald-400" />
                support@healhive.com
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Remote-First Healthcare Platform
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} HealHive. All rights reserved.
          </p>

          {/* Social Icons */}
          <div className="flex gap-4">
            <a className="text-slate-400 hover:text-emerald-400" href="#"><Facebook size={18} /></a>
            <a className="text-slate-400 hover:text-emerald-400" href="#"><Twitter size={18} /></a>
            <a className="text-slate-400 hover:text-emerald-400" href="#"><Linkedin size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
