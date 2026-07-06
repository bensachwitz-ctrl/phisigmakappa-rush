🎯 **What:** The testing gap addressed was the lack of unit tests for the pure utility functions in `lib/alumni.ts`, specifically `parseAlumniCsvRow`, `publicAlumniView`, and `summariseDonationsByCampaign`.

📊 **Coverage:** The new test file (`tests/alumni.test.ts`) covers:
- `parseAlumniCsvRow`: Happy paths with standard headers, edge cases like non-standard headers (e.g., "Name" vs "Full Name"), handling of trailing spaces in headers, safe dropping of unknown columns, and error behavior for invalid or missing required data (like an invalid year or empty name).
- `publicAlumniView`: Verifies that sensitive PII fields (email, phone, etc.) are stripped while retaining public-facing fields.
- `summariseDonationsByCampaign`: Tests that donations are correctly aggregated and sorted, with null/empty campaigns falling back to "General".

✨ **Result:** Improved test coverage and reliability for alumni utility functions without touching any existing production code.
