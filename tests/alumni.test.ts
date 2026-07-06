import { describe, it, expect } from "vitest";
import { publicAlumniView } from "@/lib/alumni";

describe("publicAlumniView", () => {
  it("projects the correct fields and coalesces undefined to null", () => {
    const input = {
      id: "123",
      fullName: "John Doe",
      graduationYear: 2020,
      pledgeClass: "Alpha",
      // These are optional and we will omit them to test `?? null`
      // city, state, employer, jobTitle, bio, linkedinUrl, preferredName
    };

    const result = publicAlumniView(input);

    expect(result).toEqual({
      id: "123",
      fullName: "John Doe",
      preferredName: null,
      graduationYear: 2020,
      pledgeClass: "Alpha",
      city: null,
      state: null,
      employer: null,
      jobTitle: null,
      bio: null,
      linkedinUrl: null,
    });
  });

  it("strips PII and extra fields not in the public view", () => {
    const input = {
      id: "456",
      fullName: "Jane Doe",
      preferredName: "Jane",
      graduationYear: 2021,
      pledgeClass: "Beta",
      city: "New York",
      state: "NY",
      employer: "Tech Corp",
      jobTitle: "Engineer",
      bio: "Hello world",
      linkedinUrl: "https://linkedin.com/in/janedoe",
      email: "jane@example.com", // PII, should be stripped
      phone: "555-1234",         // PII, should be stripped
      optInDirectory: true,
      secretField: "hidden",
    };

    const result = publicAlumniView(input);

    expect(result).toEqual({
      id: "456",
      fullName: "Jane Doe",
      preferredName: "Jane",
      graduationYear: 2021,
      pledgeClass: "Beta",
      city: "New York",
      state: "NY",
      employer: "Tech Corp",
      jobTitle: "Engineer",
      bio: "Hello world",
      linkedinUrl: "https://linkedin.com/in/janedoe",
    });

    // Explicitly verify stripped fields
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("phone");
    expect(result).not.toHaveProperty("optInDirectory");
    expect(result).not.toHaveProperty("secretField");
  });
});
