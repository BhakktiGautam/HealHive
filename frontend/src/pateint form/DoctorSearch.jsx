import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import {
  Search,
  Filter,
  MapPin,
  Star,
  Clock,
  Users,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import Navbar from "../Homepage/Navbar";
import Footer from "../Homepage/footer";
import DoctorSkeleton from '../components/DoctorSkeleton';
import {
  getAllDoctors,
  fetchRegisteredDoctors,
  getStableRating,
  getStableReviews,
  getStableIsOnline,
  getStableNextAvailable,
  getStableLocation,
} from "../utils/doctorFilterService";

const DoctorSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [registeredDoctors, setRegisteredDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Require login to access doctor search
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Pre-fill search query from route state if provided
  useEffect(() => {
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
    }
  }, [location.state?.searchQuery]);

  // Load registered doctors with loading state
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        if (!user) {
          setIsLoading(false);
          return;
        }
        const token = await user.getIdToken();
        const apiDocs = await fetchRegisteredDoctors(token);
        setRegisteredDoctors(apiDocs);
      } catch (err) {
        console.error("doctor fetch error", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  const doctors = useMemo(() => getAllDoctors(registeredDoctors), [registeredDoctors]);

  // Mock additional doctor data (keep for UI richness)
  const doctorsWithDetails = useMemo(
    () =>
      doctors.map((doc) => ({
        ...doc,
        rating: doc.rating || getStableRating(doc),
        reviews: doc.reviews || getStableReviews(doc),
        isOnline: typeof doc.isOnline === "boolean" ? doc.isOnline : getStableIsOnline(doc),
        nextAvailable:
          doc.nextAvailable || getStableNextAvailable(doc),
        location:
          doc.location || getStableLocation(doc),
      })),
    [doctors]
  );

  const specialties = ["All", ...new Set(doctorsWithDetails.map((d) => d.specialty))];

  const filteredDoctors = useMemo(() => {
    return doctorsWithDetails.filter((doc) => {
      const matchesSearch =
        searchQuery === "" ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.diseases || []).some((disease) =>
          disease.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesSpecialty = selectedSpecialty === "All" || doc.specialty === selectedSpecialty;
      return matchesSearch && matchesSpecialty;
    });
  }, [searchQuery, selectedSpecialty, doctorsWithDetails]);

  // Ensure at least 4 unique doctors for the current filter without duplicates
  const displayedDoctors = useMemo(() => {
    const pool = selectedSpecialty === "All"
      ? doctorsWithDetails
      : doctorsWithDetails.filter((d) => d.specialty === selectedSpecialty);

    const uniqueFiltered = [...filteredDoctors];
    if (uniqueFiltered.length >= 4) return uniqueFiltered;

    const needed = 4 - uniqueFiltered.length;
    const extras = pool.filter(
      (d) => !uniqueFiltered.some((u) => u.id === d.id)
    ).slice(0, needed);

    // If not enough in pool (rare), fill from all doctors without duplicates
    let result = [...uniqueFiltered, ...extras];
    if (result.length < 4) {
      const globalExtras = doctorsWithDetails.filter(
        (d) => !result.some((u) => u.id === d.id)
      ).slice(0, 4 - result.length);
      result = [...result, ...globalExtras];
    }
    return result;
  }, [filteredDoctors, doctorsWithDetails, selectedSpecialty]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
        {/* Background gradients */}
        <div className="absolute -top-24 -left-24 h-96 w-96 bg-emerald-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 -right-24 h-96 w-96 bg-teal-200/40 rounded-full blur-3xl animate-pulse delay-200" />

        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center animate-fadeUp">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Stethoscope className="h-8 w-8 text-emerald-600" />
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
                Find Your Doctor
              </h1>
            </div>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Search and book appointments with verified healthcare professionals
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8 animate-fadeUp">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
              <input
                type="text"
                placeholder="Search by doctor name, specialty, or disease..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-emerald-100 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-slate-900 placeholder-slate-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Filter Toggle & Filters */}
          <div className="max-w-2xl mx-auto mb-8 animate-fadeUp">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition"
            >
              <Filter className="h-4 w-4" /> Filters
            </button>

            {showFilters && (
              <div className="mt-4 bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4 animate-fadeUp">
                {/* Specialty Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">
                    Specialty
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((spec) => (
                      <button
                        key={spec}
                        onClick={() => setSelectedSpecialty(spec)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          selectedSpecialty === spec
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="max-w-2xl mx-auto mb-6 text-slate-600 animate-fadeUp">
            <p className="text-sm font-semibold">
              Showing <span className="text-emerald-600">
                {isLoading ? '...' : displayedDoctors.length}
              </span> doctors
            </p>
          </div>

          {/* Doctor Cards or Skeletons */}
          <div className="max-w-2xl mx-auto space-y-4 animate-fadeUp">
            {isLoading ? (
              // Show 4 skeleton loaders while loading
              <>
                <DoctorSkeleton />
                <DoctorSkeleton />
                <DoctorSkeleton />
                <DoctorSkeleton />
              </>
            ) : displayedDoctors.length > 0 ? (
              displayedDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white rounded-2xl border border-emerald-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Doctor Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                          {doctor.name.charAt(0)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-900">{doctor.name}</h3>
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                doctor.isOnline ? "bg-green-500" : "bg-slate-300"
                              }`}
                              title={doctor.isOnline ? "Online" : "Offline"}
                            />
                          </div>

                          <p className="text-sm font-semibold text-emerald-600 mb-2">
                            {doctor.specialty}
                          </p>

                          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              {doctor.rating} ({doctor.reviews} reviews)
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {doctor.nextAvailable}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {doctor.location}
                            </span>
                          </div>

                          {/* Diseases */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(doctor.diseases || []).slice(0, 3).map((disease, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-200"
                              >
                                {disease}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fee & Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Consultation Fee
                        </p>
                        <p className="text-2xl font-bold text-emerald-600">{doctor.fee}</p>
                      </div>

                      <button
                        onClick={() =>
                          navigate(`/doctor-profile/${doctor.id}`, {
                            state: { doctor },
                          })
                        }
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-semibold shadow-md hover:shadow-lg group-hover:scale-[1.02] transition-all"
                      >
                        View Profile
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Stethoscope className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">No doctors found matching your criteria</p>
                <p className="text-slate-500 text-sm mt-2">Try adjusting your search filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DoctorSearch;