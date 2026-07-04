import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Stethoscope,
  Video,
  FileText,
  CreditCard,
} from "lucide-react";

const Hero = () => {
  const transcripts = [
    "I have been experiencing headaches for the past few days…",
    "Does the pain increase during the evening?",
    "Yes doctor, especially after working on my laptop.",
    "I will prescribe medication and recommend rest.",
    "Please schedule a follow-up after 7 days.",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % transcripts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Background gradients */}
      <div className="absolute -top-24 -left-24 h-96 w-96 bg-emerald-200/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 -right-24 h-96 w-96 bg-teal-200/40 rounded-full blur-3xl animate-pulse delay-200" />

      <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* LEFT */}
        <div className="space-y-8 animate-fadeUp">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-4 py-1 text-sm font-medium">
            <Stethoscope className="h-4 w-4" />
            Digital Telehealth Platform
          </span>

          <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight text-slate-900">
            Quality Healthcare,
            <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
              Anytime. Anywhere.
            </span>
          </h1>

          <p className="text-lg text-slate-600 max-w-xl">
            HealHive enables secure telehealth consultations with live video,
            chat, online payments, and AI-powered transcription — delivering
            hospital-quality care at home.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Link
              to="/doctor-profile"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 px-6 py-3 text-white font-semibold shadow-lg hover:scale-105 transition"
            >
              <Video className="h-5 w-5" />
              Consult Now
            </Link>

            <button
              onClick={() => {
                document
                  .getElementById("how-it-works")
                  .scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-6 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition"
            >
              How It Works
            </button>
          </div>

          {/* Trust / features */}
          <div className="flex flex-wrap gap-6 pt-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Secure & Private
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              AI Transcription
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Pay Before Consult
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative animate-float">
          <div className="rounded-3xl bg-white shadow-2xl border border-emerald-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                <Video className="h-4 w-4" />
                Live Consultation
              </span>
              <span className="flex items-center gap-2 text-xs text-emerald-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Live
              </span>
            </div>

            {/* Doctor & Patient */}
            <div className="grid grid-cols-2 gap-4">
              {/* Doctor */}
              <div className="relative h-44 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200 flex flex-col items-center justify-center gap-2 shadow-inner">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center shadow">
                    <Stethoscope className="h-7 w-7 text-emerald-600" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 animate-ping"></span>
                </div>
                <p className="font-semibold text-emerald-700">Dr. Sharma</p>
                <p className="text-xs text-emerald-600">Speaking…</p>
              </div>

              {/* Patient */}
              <div className="relative h-44 rounded-2xl bg-gradient-to-br from-teal-100 to-green-200 flex flex-col items-center justify-center gap-2 shadow-inner">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center shadow">
                    <Video className="h-7 w-7 text-teal-600" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-400"></span>
                </div>
                <p className="font-semibold text-emerald-700">Patient</p>
                <p className="text-xs text-emerald-600">Listening</p>
              </div>
            </div>

            {/* Transcript Slider */}
            <div className="mt-5 rounded-xl bg-emerald-50 p-3 overflow-hidden">
              <p className="font-semibold text-emerald-700 mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Live Transcript
              </p>

              <div className="relative h-6 overflow-hidden">
                <p
                  key={index}
                  className="absolute inset-0 animate-slide-left text-sm text-slate-700 whitespace-nowrap"
                >
                  “{transcripts[index]}”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
