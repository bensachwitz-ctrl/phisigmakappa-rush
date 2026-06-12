import Foundation

struct AuthResponse: Codable {
    let ok: Bool
    let token: String?
    let error: String?
    let user: UserDetails?
}

struct UserDetails: Codable {
    let id: String
    let email: String
    let role: String
    let brotherId: String?
    let subdomain: String
    let chapterName: String
    let schoolName: String
}

struct MobileDataResponse: Codable {
    let ok: Bool
    let chapter: ChapterInfo?
    let role: String?
    let profile: MemberProfile?
    let standing: MemberStanding?
    let dues: DuesDetails?
    let announcements: [Announcement]?
    let events: [CalendarEvent]?
    let roster: ChapterRoster?
    let careers: [JobPosting]?
    let error: String?
}

struct ChapterInfo: Codable {
    let subdomain: String
    let name: String
    let schoolName: String
}

struct MemberProfile: Codable {
    let id: String
    let name: String
    let email: String
    let phone: String?
    let year: String?
    let major: String?
    let position: String?
    let pledgeClass: String?
    let hometown: String?
    let gradYear: Int?
    let bio: String?
    let headshotUrl: String?
    let status: String?
    let duesPaid: Bool?
    
    // Alumni specific fields
    let graduationYear: Int?
    let initiationYear: Int?
    let city: String?
    let state: String?
    let employer: String?
    let jobTitle: String?
    let linkedinUrl: String?
}

struct MemberStanding: Codable {
    let score: Double
    let max: Double
    let pct: Double
    let standing: String
    let breakdown: [StandingBreakdownItem]?
}

struct StandingBreakdownItem: Codable, Identifiable {
    var id: String { name }
    let name: String
    let points: Double
    let max: Double
}

struct DuesDetails: Codable {
    let config: DuesConfig?
    let payments: [DuesPayment]?
    let donations: [AlumniDonation]?
    let isPaid: Bool?
}

struct DuesConfig: Codable {
    let enabled: Bool
    let amountCents: Int
    let year: String
    let label: String
    let stripePublishableKey: String?
}

struct DuesPayment: Codable, Identifiable {
    let id: String
    let amountCents: Int
    let year: String
    let status: String
    let method: String
    let receiptUrl: String?
    let notes: String?
    let createdAt: String
}

struct AlumniDonation: Codable, Identifiable {
    let id: String
    let amountCents: Int
    let campaign: String
    let status: String
    let recordedAt: String
    let notes: String?
}

struct Announcement: Codable, Identifiable {
    let id: String
    let title: String
    let body: String
    let pinned: Bool
    let createdAt: String
    let authorName: String
    let authorRole: String
}

struct CalendarEvent: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let location: String?
    let dressCode: String?
    let startsAt: String
    let endsAt: String?
    let category: String?
    var myRsvp: RsvpDetails?
}

struct RsvpDetails: Codable {
    let status: String
    let note: String?
}

struct ChapterRoster: Codable {
    let actives: [RosterMember]
    let alumni: [RosterAlum]
}

struct RosterMember: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let phone: String?
    let year: String?
    let major: String?
    let position: String?
    let pledgeClass: String?
    let headshotUrl: String?
    let status: String?
}

struct RosterAlum: Codable, Identifiable {
    let id: String
    let name: String
    let preferredName: String?
    let graduationYear: Int?
    let pledgeClass: String?
    let email: String
    let phone: String?
    let city: String?
    let state: String?
    let employer: String?
    let jobTitle: String?
    let linkedinUrl: String?
    let bio: String?
}

struct JobPosting: Codable, Identifiable {
    let id: String
    let title: String
    let company: String
    let location: String
    let description: String
    let requirements: String?
    let salary: String?
    let contactName: String?
    let contactEmail: String?
    let contactPhone: String?
    let postedByName: String?
    let postedByRole: String?
    let createdAt: String
}
