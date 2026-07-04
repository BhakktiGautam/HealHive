import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function CTASection() {
  return (
    <div className="bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-12 px-4 lg:px-16">
      <section className="relative bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl py-20 px-6 md:px-16 lg:px-24 overflow-hidden">
        
        {/* Animated background circles (CSS only) */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-spin-slow"></div>
        <div className="absolute -bottom-28 -right-20 w-80 h-80 bg-white/20 rounded-full blur-3xl animate-spin-reverse"></div>

        <div className="relative max-w-3xl mx-auto text-center text-white">
          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 animate-fadeUp">
            Consult Top Doctors From Anywhere
          </h2>

          {/* Subtitle */}
          <p
            className="text-lg text-white/90 mb-8 animate-fadeUp"
            style={{ animationDelay: "120ms" }}
          >
            HealHive enables secure video consultations, real-time chat, online
            payments, and privacy-first healthcare — all from the comfort of your home.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row justify-center gap-4 animate-fadeUp"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              to="/doctor-profile"
              className="inline-flex items-center justify-center gap-3 bg-white text-emerald-700 font-semibold px-7 py-4 rounded-full shadow-lg"
            >
              Consult Now
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center border border-white text-white font-semibold px-7 py-4 rounded-full"
            >
              Get Started
            </Link>
          </div>

          {/* Subline text */}
          <p
            className="mt-8 text-sm text-white/80 animate-fadeUp"
            style={{ animationDelay: "360ms" }}
          >
            Healthcare without boundaries — secure, accessible, and trusted.
          </p>
        </div>
      </section>
    </div>
  );
}
