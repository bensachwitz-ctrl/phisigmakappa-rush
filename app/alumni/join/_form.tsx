"use client";

// Public alumni signup form — POST to /api/alumni/join.
// Self-contained client component so the parent page stays an RSC.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconSpinner as Loader2 } from "@/components/brand/icons";

const THIS_YEAR = new Date().getFullYear();

export default function AlumniJoinForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      fullName: String(data.get("fullName") || "").trim(),
      preferredName: String(data.get("preferredName") || "").trim() || null,
      graduationYear: parseInt(String(data.get("graduationYear") || ""), 10),
      pledgeClass: String(data.get("pledgeClass") || "").trim() || null,
      email: String(data.get("email") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      employer: String(data.get("employer") || "").trim() || null,
      jobTitle: String(data.get("jobTitle") || "").trim() || null,
      linkedinUrl: String(data.get("linkedinUrl") || "").trim() || null,
      bio: String(data.get("bio") || "").trim() || null,
    };

    try {
      const res = await fetch("/api/alumni/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error || "Something went wrong. Try again in a sec.");
        setSubmitting(false);
        return;
      }
      // Redirect to the new profile so the user can see they're in.
      router.push(`/alumni/${body.id}?welcome=1`);
    } catch (err) {
      setError("Network hiccup — try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Required block */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-wider text-maroon-700 font-semibold mb-2">
          Required
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" name="fullName" required maxLength={120} autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="graduationYear">Graduation year *</Label>
            <Input
              id="graduationYear"
              name="graduationYear"
              required
              type="number"
              min={1873}
              max={THIS_YEAR + 6}
              defaultValue={THIS_YEAR - 1}
              inputMode="numeric"
            />
          </div>
        </div>
      </fieldset>

      {/* Identity block */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-wider text-maroon-700 font-semibold mb-2">
          Identity
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="preferredName">Preferred name</Label>
            <Input id="preferredName" name="preferredName" maxLength={60} />
          </div>
          <div>
            <Label htmlFor="pledgeClass">Pledge class</Label>
            <Input id="pledgeClass" name="pledgeClass" maxLength={30} placeholder="e.g. Fall 2018" />
          </div>
        </div>
      </fieldset>

      {/* Contact block */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-wider text-maroon-700 font-semibold mb-2">
          Contact (private — only brothers + officers see)
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" maxLength={200} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} />
          </div>
        </div>
      </fieldset>

      {/* Where you are block */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-wider text-maroon-700 font-semibold mb-2">
          Where you are
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" maxLength={80} autoComplete="address-level2" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              name="state"
              maxLength={30}
              placeholder="e.g. SC"
              autoComplete="address-level1"
            />
          </div>
          <div>
            <Label htmlFor="employer">Employer</Label>
            <Input id="employer" name="employer" maxLength={120} autoComplete="organization" />
          </div>
          <div>
            <Label htmlFor="jobTitle">Job title</Label>
            <Input id="jobTitle" name="jobTitle" maxLength={120} autoComplete="organization-title" />
          </div>
        </div>
        <div>
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            type="url"
            placeholder="https://linkedin.com/in/yourname"
            maxLength={300}
          />
        </div>
      </fieldset>

      {/* What you're up to */}
      <div>
        <Label htmlFor="bio">What you&apos;re up to (1-2 lines)</Label>
        <Textarea
          id="bio"
          name="bio"
          maxLength={500}
          rows={3}
          placeholder="e.g. Software engineer at Apple in Cupertino. Just hit 5 years married."
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto bg-maroon-700 hover:bg-maroon-800 text-cream-50 disabled:opacity-60"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
              Adding you to the network…
            </>
          ) : (
            <>Join the network</>
          )}
        </Button>
      </div>
    </form>
  );
}
