"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  ArrowLeft, 
  ArrowRight, 
  User, 
  Mail, 
  Lock, 
  MapPin, 
  Briefcase, 
  Phone, 
  CheckCircle,
  Calendar,
  BookOpen,
  Award
} from "lucide-react";

export default function AlumniRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    preferredName: "",
    email: "",
    password: "",
    graduationYear: new Date().getFullYear().toString(),
    major: "",
    pledgeClass: "",
    age: "",
    isEmployed: "yes",
    employer: "",
    jobTitle: "",
    city: "",
    state: "",
    phone: "",
    linkedinUrl: "",
    bio: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === 1) {
      if (!formData.fullName.trim()) return setError("Full name is required.");
      if (!formData.email.trim()) return setError("Email is required.");
      if (!formData.password || formData.password.length < 8) {
        return setError("Password must be at least 8 characters.");
      }
    } else if (step === 2) {
      const year = parseInt(formData.graduationYear, 10);
      if (isNaN(year) || year < 1873 || year > 2099) {
        return setError("Please provide a valid graduation year.");
      }
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal/alumni/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          graduationYear: parseInt(formData.graduationYear, 10),
          age: formData.age ? parseInt(formData.age, 10) : null,
          employer: formData.isEmployed === "yes" ? formData.employer : "",
          jobTitle: formData.isEmployed === "yes" ? formData.jobTitle : "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        // Success - redirect to dashboard
        router.push("/portal/alumni/dashboard");
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between">
      <div>
        <PublicNav />

        <main className="max-w-xl mx-auto px-4 py-8 sm:py-12">
          <Link
            href="/portal/alumni"
            className="inline-flex items-center gap-1.5 text-sm text-maroon-700 hover:text-maroon-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Alumni Landing
          </Link>

          {/* Stepper Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Step {step} of 4: {
                  step === 1 ? "Account Credentials" :
                  step === 2 ? "Education & Chapter" :
                  step === 3 ? "Professional & Location" :
                  "Review & Submit"
                }
              </span>
              <span className="text-sm font-semibold text-maroon-900">{Math.round((step / 4) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-cream-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-maroon-700 h-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-maroon-100 p-6 sm:p-8 shadow-sm">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Account setup */}
            {step === 1 && (
              <form onSubmit={handleNext} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-maroon-900 mb-1">Set up your account</h2>
                  <p className="text-xs text-maroon-600 mb-4">Let&apos;s start with your access credentials and full name.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        required
                        className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      Preferred Name (Optional)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                      <input
                        type="text"
                        name="preferredName"
                        value={formData.preferredName}
                        onChange={handleChange}
                        placeholder="Johnny"
                        className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john.doe@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                      />
                    </div>
                    <p className="text-[10px] text-maroon-500 mt-1">Must be at least 8 characters long.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full bg-maroon-700 hover:bg-maroon-800 text-cream-50 flex items-center justify-center gap-1">
                    Next Section
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Step 2: Education & Chapter */}
            {step === 2 && (
              <form onSubmit={handleNext} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-maroon-900 mb-1">Fraternity & Education</h2>
                  <p className="text-xs text-maroon-600 mb-4">Record your graduation details and chapter history.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Graduation Year *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="number"
                          name="graduationYear"
                          value={formData.graduationYear}
                          onChange={handleChange}
                          placeholder="2020"
                          required
                          min={1873}
                          max={2099}
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Pledge Class (Optional)
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="text"
                          name="pledgeClass"
                          value={formData.pledgeClass}
                          onChange={handleChange}
                          placeholder="Fall 2016"
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Major / Field of Study
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="text"
                          name="major"
                          value={formData.major}
                          onChange={handleChange}
                          placeholder="Finance"
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Age (Optional)
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          placeholder="28"
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" onClick={handleBack} className="w-1/2 bg-cream-100 hover:bg-cream-200 text-maroon-900 flex items-center justify-center gap-1 border border-maroon-200">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button type="submit" className="w-1/2 bg-maroon-700 hover:bg-maroon-800 text-cream-50 flex items-center justify-center gap-1">
                    Next Section
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Professional & Location */}
            {step === 3 && (
              <form onSubmit={handleNext} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-maroon-900 mb-1">Current Status & Location</h2>
                  <p className="text-xs text-maroon-600 mb-4">Tell us where you are and what you are doing professionally.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      Are you currently employed?
                    </label>
                    <select
                      name="isEmployed"
                      value={formData.isEmployed}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No / Retired / Student</option>
                    </select>
                  </div>

                  {formData.isEmployed === "yes" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                          Employer / Company
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                          <input
                            type="text"
                            name="employer"
                            value={formData.employer}
                            onChange={handleChange}
                            placeholder="Google"
                            className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                          Job Title
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                          <input
                            type="text"
                            name="jobTitle"
                            value={formData.jobTitle}
                            onChange={handleChange}
                            placeholder="Software Engineer"
                            className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Current City
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Charlotte"
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Current State
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="NC"
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="555-0199"
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        LinkedIn URL (Optional)
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                        <input
                          type="text"
                          name="linkedinUrl"
                          value={formData.linkedinUrl}
                          onChange={handleChange}
                          placeholder="https://linkedin.com/in/username"
                          className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      Short Bio / Note to Actives
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Graduated in 2020. Working in tech. Happy to connect with active brothers or PNMs about careers..."
                      rows={3}
                      className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" onClick={handleBack} className="w-1/2 bg-cream-100 hover:bg-cream-200 text-maroon-900 flex items-center justify-center gap-1 border border-maroon-200">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button type="submit" className="w-1/2 bg-maroon-700 hover:bg-maroon-800 text-cream-50 flex items-center justify-center gap-1">
                    Review Profile
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Step 4: Review and Complete */}
            {step === 4 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-maroon-900 mb-1">Review your details</h2>
                  <p className="text-xs text-maroon-600 mb-4">Please verify your information before finishing onboarding.</p>
                </div>

                <div className="space-y-4 text-sm text-maroon-900 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin bg-cream-50/50 p-4 rounded-xl border border-maroon-100">
                  <div className="border-b border-maroon-100 pb-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide block">Account</span>
                    <p className="font-semibold">{formData.fullName} ({formData.email})</p>
                    {formData.preferredName && <p className="text-xs text-maroon-600">Preferred Name: {formData.preferredName}</p>}
                  </div>

                  <div className="border-b border-maroon-100 pb-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide block">Education & Chapter</span>
                    <p className="font-semibold">Class of {formData.graduationYear}</p>
                    {formData.major && <p className="text-xs text-maroon-600">Major: {formData.major}</p>}
                    {formData.pledgeClass && <p className="text-xs text-maroon-600">Pledge Class: {formData.pledgeClass}</p>}
                    {formData.age && <p className="text-xs text-maroon-600">Age: {formData.age}</p>}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide block">Professional & Location</span>
                    {formData.isEmployed === "yes" && formData.employer ? (
                      <p className="font-semibold">{formData.jobTitle || "Employed"} at {formData.employer}</p>
                    ) : (
                      <p className="font-semibold">Not Currently Employed</p>
                    )}
                    {(formData.city || formData.state) && (
                      <p className="text-xs text-maroon-600">Location: {formData.city || ""}{formData.city && formData.state ? ", " : ""}{formData.state || ""}</p>
                    )}
                    {formData.phone && <p className="text-xs text-maroon-600">Phone: {formData.phone}</p>}
                    {formData.linkedinUrl && <p className="text-xs text-maroon-600 truncate">LinkedIn: {formData.linkedinUrl}</p>}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" onClick={handleBack} disabled={loading} className="w-1/2 bg-cream-100 hover:bg-cream-200 text-maroon-900 flex items-center justify-center gap-1 border border-maroon-200">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="w-1/2 bg-gradient-to-r from-amber-600 to-maroon-700 hover:from-amber-700 hover:to-maroon-800 text-cream-50 flex items-center justify-center gap-1.5 shadow-md">
                    {loading ? (
                      <span>Creating Profile...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Complete Profile
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
