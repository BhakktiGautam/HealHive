import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { doctors } from "../utils/doctorFilterService";
import { useTheme } from "../Context/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

const navLinks = [
  { name: "Home", to: "/" },
  { name: "How It Works", to: "/#how-it-works" },
  { name: "Specialties", to: "/#specialties" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu handler
  const closeMobileMenu = () => {
    setOpen(false);
  };

  const handleNavClick = (e, to) => {
    // If link is an in-page anchor (/#id), navigate to home then scroll
    if (to.startsWith("/#")) {
      e.preventDefault();
      const id = to.substring(2);
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
      closeMobileMenu(); // Close mobile menu after click
    } else if (to === "/") {
      if (location.pathname === "/") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        closeMobileMenu(); // Close mobile menu after click
      } else {
        closeMobileMenu(); // Close mobile menu after click
      }
    } else {
      closeMobileMenu(); // Close mobile menu after click
    }
  };

  const searchSuggestions = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return [];

    const suggestions = [];
    const seen = new Set();
    const addSuggestion = (suggestion) => {
      const key = `${suggestion.type}:${suggestion.value}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push(suggestion);
      }
    };

    doctors.forEach((doctor) => {
      if (doctor.name.toLowerCase().includes(query)) {
        addSuggestion({
          type: "Doctor",
          label: doctor.name,
          value: doctor.name,
          meta: doctor.specialty,
        });
      }

      if (doctor.specialty.toLowerCase().includes(query)) {
        addSuggestion({
          type: "Specialty",
          label: doctor.specialty,
          value: doctor.specialty,
          meta: "Find matching specialists",
        });
      }

      doctor.diseases?.forEach((disease) => {
        if (disease.toLowerCase().includes(query)) {
          addSuggestion({
            type: "Condition",
            label: disease,
            value: disease,
            meta: doctor.specialty,
          });
        }
      });
    });

    return suggestions.slice(0, 6);
  }, [searchInput]);

  const handleSearchDoctors = (query = searchInput) => {
    const nextQuery = query.trim();
    setShowSuggestions(false);
    setActiveSuggestion(-1);

    if (nextQuery) {
      navigate("/doctor-search", { state: { searchQuery: nextQuery } });
      setSearchInput("");
    } else {
      navigate("/doctor-search");
    }
    closeMobileMenu(); // Close mobile menu after search
  };

  const handleSuggestionSelect = (suggestion) => {
    setSearchInput(suggestion.value);
    handleSearchDoctors(suggestion.value);
  };

  // Auth listener & fetch user role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/users/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const data = await res.json();
          setUserRole(data.role);
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    setShowAccount(false);
    closeMobileMenu(); // Close mobile menu after logout
    navigate("/login");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowAccount(false);
        setShowThemeMenu(false);
        setOpen(false);
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-emerald-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-lg font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent"
              onClick={closeMobileMenu}
            >
              HealHive
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleNavClick(e, link.to)}
                  className="px-4 py-2 rounded-lg text-md font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3" ref={menuRef}>
            {/* SEARCH BAR */}
            <div className="relative hidden lg:block">
              <div className="flex items-center gap-2 bg-emerald-50/60 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-200 dark:focus-within:ring-slate-700">
                <svg
                  className="h-4 w-4 text-emerald-400 dark:text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35m0 0A7 7 0 1116.65 16.65z"
                  />
                </svg>
                <input
                  className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-emerald-400 dark:placeholder-slate-500 w-56"
                  placeholder="Search doctors, specialties"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                    setActiveSuggestion(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setShowSuggestions(true);
                      setActiveSuggestion((current) =>
                        Math.min(current + 1, searchSuggestions.length - 1)
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveSuggestion((current) =>
                        Math.max(current - 1, 0)
                      );
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        activeSuggestion >= 0 &&
                        searchSuggestions[activeSuggestion]
                      ) {
                        handleSuggestionSelect(
                          searchSuggestions[activeSuggestion]
                        );
                      } else {
                        handleSearchDoctors();
                      }
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setActiveSuggestion(-1);
                    }
                  }}
                />
                {searchInput && (
                  <button
                    onClick={() => handleSearchDoctors()}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-350 transition ml-1"
                    title="Search"
                    type="button"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7m0 0l-7 7m7-7H5"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {showSuggestions &&
                searchInput.trim() &&
                searchSuggestions.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-emerald-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.type}-${suggestion.value}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionSelect(suggestion);
                        }}
                        onMouseEnter={() => setActiveSuggestion(index)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                          activeSuggestion === index
                            ? "bg-emerald-50 dark:bg-slate-700"
                            : "hover:bg-emerald-50 dark:hover:bg-slate-750"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {suggestion.label}
                          </span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                            {suggestion.meta}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-350">
                          {suggestion.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {/* CTA - My Dashboard */}
            {user ? (
              <button
                onClick={() => {
                  const dashboardUrl =
                    userRole === "doctor"
                      ? "/doctor-dashboard"
                      : "/patient-dashboard";
                  navigate(dashboardUrl);
                  setShowAccount(false);
                  closeMobileMenu();
                }}
                className="hidden md:inline-flex bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow hover:scale-[1.02] transition"
              >
                My Dashboard
              </button>
            ) : (
              <Link
                to="/doctor-profile"
                onClick={closeMobileMenu}
                className="hidden md:inline-flex bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow hover:scale-[1.02] transition"
              >
                Consult Now
              </Link>
            )}

            {/* Theme Toggle Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowThemeMenu((s) => !s);
                  setShowAccount(false);
                }}
                className="p-2 rounded-xl border border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                title="Toggle theme"
              >
                {theme === "light" && <Sun className="h-5 w-5 text-amber-500" />}
                {theme === "dark" && <Moon className="h-5 w-5 text-indigo-400" />}
                {theme === "system" && <Monitor className="h-5 w-5 text-slate-500" />}
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 mt-3 w-36 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-emerald-100 dark:border-slate-700 overflow-hidden z-50">
                  <button
                    onClick={() => {
                      toggleTheme("light");
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700 ${
                      theme === "light"
                        ? "bg-emerald-50/50 dark:bg-slate-700/50 font-semibold"
                        : ""
                    }`}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    Light
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme("dark");
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700 ${
                      theme === "dark"
                        ? "bg-emerald-50/50 dark:bg-slate-700/50 font-semibold"
                        : ""
                    }`}
                  >
                    <Moon className="h-4 w-4 text-indigo-400" />
                    Dark
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme("system");
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700 ${
                      theme === "system"
                        ? "bg-emerald-50/50 dark:bg-slate-700/50 font-semibold"
                        : ""
                    }`}
                  >
                    <Monitor className="h-4 w-4 text-slate-500" />
                    System
                  </button>
                </div>
              )}
            </div>

            {/* ACCOUNT */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowAccount((s) => !s);
                  setShowThemeMenu(false);
                }}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-full p-1 hover:shadow transition"
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${user?.displayName || "Account"}&background=059669&color=fff`}
                  alt="avatar"
                  className="h-8 w-8 rounded-full"
                />
                <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user?.displayName || "Account"}
                </span>
              </button>

              {showAccount && (
                <div className="absolute right-0 mt-3 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-emerald-100 dark:border-slate-700 overflow-hidden">
                  {!user ? (
                    <>
                      <Link
                        to="/create-account"
                        onClick={closeMobileMenu}
                        className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        Create Account
                      </Link>
                      <Link
                        to="/login"
                        onClick={closeMobileMenu}
                        className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        Login
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to={
                          userRole === "doctor"
                            ? "/doctor-dashboard"
                            : "/patient-dashboard"
                        }
                        onClick={closeMobileMenu}
                        className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        My Dashboard
                      </Link>
                      {userRole === "patient" && (
                        <>
                          <Link
                            to="/doctor-search"
                            onClick={closeMobileMenu}
                            className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            Find a Doctor
                          </Link>
                          <Link
                            to="/appointment-history"
                            onClick={closeMobileMenu}
                            className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            My Appointments
                          </Link>
                        </>
                      )}
                      <Link
                        to="/settings"
                        onClick={closeMobileMenu}
                        className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* MOBILE HAMBURGER */}
            <button
              onClick={() => setOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU - FIXED: Auto-closes on link click */}
      {open && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-emerald-100 dark:border-slate-800">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={(e) => handleNavClick(e, link.to)}
                className="block px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {link.name}
              </Link>
            ))}
            {/* Additional mobile menu items */}
            {user ? (
              <>
                <Link
                  to={userRole === "doctor" ? "/doctor-dashboard" : "/patient-dashboard"}
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  My Dashboard
                </Link>
                {userRole === "patient" && (
                  <Link
                    to="/doctor-search"
                    onClick={closeMobileMenu}
                    className="block px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Find a Doctor
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Login
                </Link>
                <Link
                  to="/create-account"
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;