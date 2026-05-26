"use client";

import { useState } from "react";
import { 
  GraduationCap, 
  Search, 
  Trash2, 
  UserPlus, 
  Upload, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  CheckCircle,
  XCircle,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alumnus {
  id: string;
  fullName: string;
  preferredName: string | null;
  graduationYear: number;
  pledgeClass: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  employer: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  bio: string | null;
}

interface AlumniManagerProps {
  initialAlumni: Alumnus[];
}

export function AlumniManager({ initialAlumni }: AlumniManagerProps) {
  const [alumniList, setAlumniList] = useState<Alumnus[]>(initialAlumni);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add form state
  const [formData, setFormData] = useState({
    fullName: "",
    preferredName: "",
    graduationYear: new Date().getFullYear().toString(),
    pledgeClass: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    employer: "",
    jobTitle: "",
    linkedinUrl: "",
    bio: "",
  });

  // CSV states
  const [csvText, setCsvText] = useState("");

  // Search filter
  const filtered = alumniList.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.fullName.toLowerCase().includes(q) ||
      (a.employer && a.employer.toLowerCase().includes(q)) ||
      (a.city && a.city.toLowerCase().includes(q)) ||
      (a.state && a.state.toLowerCase().includes(q)) ||
      a.graduationYear.toString().includes(q)
    );
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          graduationYear: parseInt(formData.graduationYear, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add alumnus.");
      } else {
        setAlumniList((prev) => [data.alumni, ...prev]);
        setShowAddModal(false);
        // Reset form
        setFormData({
          fullName: "",
          preferredName: "",
          graduationYear: new Date().getFullYear().toString(),
          pledgeClass: "",
          email: "",
          phone: "",
          city: "",
          state: "",
          employer: "",
          jobTitle: "",
          linkedinUrl: "",
          bio: "",
        });
      }
    } catch (err) {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the alumni database?`)) return;

    try {
      const res = await fetch(`/api/admin/alumni/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAlumniList((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert("Failed to delete alumnus.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simple CSV parser
    const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setError("CSV must contain a header row and at least one data row.");
      setLoading(false);
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const rows = lines.slice(1).map(row => 
      row.split(",").map(cell => cell.trim().replace(/^["']|["']$/g, ""))
    );

    try {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: { headers, rows } }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to import CSV.");
      } else {
        alert(`Successfully imported ${data.imported} alumni! (${data.failed} failed)`);
        // Refresh the page data
        window.location.reload();
      }
    } catch (err) {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-maroon-100 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search alumni..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none bg-maroon-800 hover:bg-maroon-900 text-cream-50 flex items-center justify-center gap-1.5 rounded-xl font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            Add Alumnus
          </Button>
          <Button
            onClick={() => setShowCsvModal(true)}
            variant="outline"
            className="flex-1 sm:flex-none border-maroon-200 text-maroon-900 hover:bg-cream-50 flex items-center justify-center gap-1.5 rounded-xl font-semibold"
          >
            <Upload className="w-4 h-4" />
            CSV Import
          </Button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-maroon-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-cream-50/50 border-b border-maroon-100 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Grad Year</th>
                <th className="px-6 py-4">Professional</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-maroon-50 text-maroon-950">
              {filtered.length > 0 ? (
                filtered.map((alumni) => (
                  <tr key={alumni.id} className="hover:bg-cream-50/20 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-maroon-900">{alumni.fullName}</div>
                      {alumni.pledgeClass && (
                        <div className="text-xs text-muted-foreground">{alumni.pledgeClass}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-amber-800">{alumni.graduationYear}</span>
                    </td>
                    <td className="px-6 py-4">
                      {alumni.employer ? (
                        <div>
                          <div className="font-semibold text-xs text-maroon-900">{alumni.jobTitle || "Employed"}</div>
                          <div className="text-xs text-muted-foreground">{alumni.employer}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      {alumni.email && (
                        <a href={`mailto:${alumni.email}`} className="text-xs hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {alumni.email}
                        </a>
                      )}
                      {alumni.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {alumni.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {alumni.city ? (
                        <span className="text-xs text-maroon-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {alumni.city}, {alumni.state || ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(alumni.id, alumni.fullName)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                        title="Delete Alumnus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No alumni profiles found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD ALUMNUS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-maroon-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-2xl border border-maroon-100 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-maroon-900 flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Add Alumnus Profile
              </h3>
              <p className="text-xs text-muted-foreground">Create a new alumnus directory record manually.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Graduation Year *</label>
                <input
                  type="number"
                  required
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  placeholder="2020"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Pledge Class</label>
                <input
                  type="text"
                  value={formData.pledgeClass}
                  onChange={(e) => setFormData({ ...formData, pledgeClass: e.target.value })}
                  placeholder="Fall 2016"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Preferred Name</label>
                <input
                  type="text"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="Johnny"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="555-0199"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Columbia"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SC"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Employer / Company</label>
                <input
                  type="text"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  placeholder="Google"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="Software Engineer"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Bio / Note</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief bio notes..."
                rows={2}
                className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={loading}
                variant="outline"
                className="w-1/2 border-maroon-200 text-maroon-900 rounded-xl py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-1/2 bg-maroon-800 hover:bg-maroon-900 text-cream-50 rounded-xl py-2"
              >
                {loading ? "Adding..." : "Add Profile"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-maroon-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCsvImport} className="bg-white rounded-2xl border border-maroon-100 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-maroon-900 flex items-center gap-1.5">
                <Upload className="w-5 h-5 text-amber-500" />
                CSV Bulk Import
              </h3>
              <p className="text-xs text-muted-foreground">Import multiple alumni profiles in one go.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">{error}</div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-maroon-900">Paste CSV Contents</label>
              <p className="text-[10px] text-muted-foreground mb-1">
                Required columns: <code>fullName</code>, <code>graduationYear</code>. 
                Optional: <code>preferredName</code>, <code>pledgeClass</code>, <code>email</code>, <code>phone</code>, <code>city</code>, <code>state</code>, <code>employer</code>, <code>jobTitle</code>, <code>linkedinUrl</code>, <code>bio</code>.
              </p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`fullName,graduationYear,pledgeClass,email,city,state\nJohn Doe,2018,Fall 2014,john@doe.com,Atlanta,GA\nJane Smith,2015,Spring 2012,jane@smith.com,New York,NY`}
                rows={8}
                required
                className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setShowCsvModal(false)}
                disabled={loading}
                variant="outline"
                className="w-1/2 border-maroon-200 text-maroon-900 rounded-xl py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-1/2 bg-maroon-800 hover:bg-maroon-900 text-cream-50 rounded-xl py-2"
              >
                {loading ? "Importing..." : "Run Import"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
