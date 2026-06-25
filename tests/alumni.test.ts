import { describe, it, expect } from "vitest";
import { parseAlumniCsvRow, publicAlumniView, summariseDonationsByCampaign } from "@/lib/alumni";

describe("parseAlumniCsvRow", () => {
  it("should successfully parse a valid row with standard headers", () => {
    const headers = [
      "Full Name",
      "Graduation Year",
      "Pledge Class",
      "Email",
      "Phone",
      "City",
      "State",
      "Employer",
      "Job Title",
      "LinkedIn",
      "Bio",
    ];
    const values = [
      "John Doe",
      "2020",
      "Alpha",
      "john@example.com",
      "123-456-7890",
      "New York",
      "NY",
      "Acme Corp",
      "Engineer",
      "https://linkedin.com/in/johndoe",
      "Hello world",
    ];

    const result = parseAlumniCsvRow(headers, values);
    expect(result).not.toHaveProperty("error");
    expect(result).toEqual({
      fullName: "John Doe",
      preferredName: null,
      graduationYear: 2020,
      pledgeClass: "Alpha",
      initiationYear: null,
      email: "john@example.com",
      phone: "123-456-7890",
      city: "New York",
      state: "NY",
      employer: "Acme Corp",
      jobTitle: "Engineer",
      linkedinUrl: "https://linkedin.com/in/johndoe",
      bio: "Hello world",
      optInDirectory: true,
      optInNewsletter: true,
      brotherId: null,
    });
  });

  it("should normalize headers and handle variations like 'Name' and 'Year'", () => {
    const headers = ["Name", "Year", "Title", "LinkedIn"];
    const values = ["Jane Doe", "2021", "CEO", "url"];

    const result = parseAlumniCsvRow(headers, values);
    expect(result).not.toHaveProperty("error");
    expect(result).toEqual(
      expect.objectContaining({
        fullName: "Jane Doe",
        graduationYear: 2021,
        jobTitle: "CEO",
        linkedinUrl: "url",
      })
    );
  });

  it("should ignore trailing spaces and special characters in headers", () => {
    const headers = ["  Full Name \n", " Graduation Year*", "!!Pledge Class "];
    const values = ["Jimmy", "2010", "Beta"];

    const result = parseAlumniCsvRow(headers, values);
    expect(result).not.toHaveProperty("error");
    expect(result).toEqual(
      expect.objectContaining({
        fullName: "Jimmy",
        graduationYear: 2010,
        pledgeClass: "Beta",
      })
    );
  });

  it("should safely drop unknown columns without breaking", () => {
    const headers = ["Full Name", "Graduation Year", "Random ID", "Fav Color"];
    const values = ["Mark", "2015", "123", "Blue"];

    const result = parseAlumniCsvRow(headers, values);
    expect(result).not.toHaveProperty("error");
    expect(result).toEqual(
      expect.objectContaining({
        fullName: "Mark",
        graduationYear: 2015,
      })
    );
    // Ensure unknown headers didn't end up on the object
    expect((result as any)["Fav Color"]).toBeUndefined();
    expect((result as any)["Random ID"]).toBeUndefined();
  });

  it("should return an error if a required field is invalid (e.g. invalid graduation year)", () => {
    const headers = ["Full Name", "Graduation Year"];
    const values = ["Jack", "Not A Year"];

    const result = parseAlumniCsvRow(headers, values);
    expect(result).toHaveProperty("error");
    expect((result as any).error).toMatch(/graduationYear/i);
  });

  it("should return an error if fullName is missing or empty", () => {
    const headers = ["Full Name", "Graduation Year"];
    const values = ["", "2020"];

    const result = parseAlumniCsvRow(headers, values);
    expect(result).toHaveProperty("error");
    expect((result as any).error).toMatch(/fullName/i);
  });

  it("should handle missing values safely", () => {
    const headers = ["Full Name", "Graduation Year", "Employer"];
    // Values array is shorter than headers array
    const values = ["Alice", "2005"];

    const result = parseAlumniCsvRow(headers, values);
    expect(result).not.toHaveProperty("error");
    expect(result).toEqual(
      expect.objectContaining({
        fullName: "Alice",
        graduationYear: 2005,
        employer: null,
      })
    );
  });

  it("should return an error if normaliseAlumniInput returns an error for other reasons", () => {
    const headers = ["Full Name", "Graduation Year"];
    const values = ["A", "2020"]; // name too short

    const result = parseAlumniCsvRow(headers, values);
    expect(result).toHaveProperty("error");
    expect((result as any).error).toMatch(/fullName 2-200 chars required/i);
  });
});

describe("publicAlumniView", () => {
  it("should project full row into public view and strip email and phone", () => {
    const row = {
      id: "test-id-1",
      fullName: "Jane Smith",
      preferredName: "Janey",
      graduationYear: 2019,
      pledgeClass: "Gamma",
      initiationYear: 2016, // Should be stripped/ignored
      email: "jane@example.com", // Should be stripped/ignored
      phone: "987-654-3210", // Should be stripped/ignored
      city: "Los Angeles",
      state: "CA",
      employer: "Tech Inc",
      jobTitle: "Developer",
      linkedinUrl: "https://linkedin.com/in/janesmith",
      bio: "Tech enthusiast",
      optInDirectory: true, // Should be stripped/ignored (assumes caller handles logic)
      optInNewsletter: true, // Should be stripped/ignored
      brotherId: "b-123", // Should be stripped/ignored
    };

    const publicView = publicAlumniView(row);
    expect(publicView).toEqual({
      id: "test-id-1",
      fullName: "Jane Smith",
      preferredName: "Janey",
      graduationYear: 2019,
      pledgeClass: "Gamma",
      city: "Los Angeles",
      state: "CA",
      employer: "Tech Inc",
      jobTitle: "Developer",
      bio: "Tech enthusiast",
      linkedinUrl: "https://linkedin.com/in/janesmith",
    });

    expect((publicView as any).email).toBeUndefined();
    expect((publicView as any).phone).toBeUndefined();
  });
});

describe("summariseDonationsByCampaign", () => {
  it("should summarize donations by campaign, fallback to General, and sort descending", () => {
    const donations = [
      { campaign: "Capital", amountCents: 1000 },
      { campaign: "Capital", amountCents: 500 },
      { campaign: "Scholarship", amountCents: 5000 },
      { campaign: null, amountCents: 250 },
      { campaign: "  ", amountCents: 100 },
    ];

    const summary = summariseDonationsByCampaign(donations as any);
    expect(summary).toEqual([
      { campaign: "Scholarship", totalCents: 5000, count: 1 },
      { campaign: "Capital", totalCents: 1500, count: 2 },
      { campaign: "General", totalCents: 350, count: 2 },
    ]);
  });
});
