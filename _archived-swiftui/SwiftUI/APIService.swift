import Foundation
import Combine

class APIService: ObservableObject {
    static let shared = APIService()
    
    @Published var token: String? = nil
    @Published var subdomain: String = ""
    @Published var role: String = "brother"
    @Published var userDetails: UserDetails? = nil
    @Published var dashboardData: MobileDataResponse? = nil
    @Published var isOfflineMode: Bool = false
    
    private let tokenKey = "gs_auth_token"
    private let subdomainKey = "gs_subdomain"
    private let roleKey = "gs_role"
    private let userDetailsKey = "gs_user_details"
    private let cachedDataKey = "gs_cached_dashboard_data"
    
    private init() {
        self.token = UserDefaults.standard.string(forKey: tokenKey)
        self.subdomain = UserDefaults.standard.string(forKey: subdomainKey) ?? ""
        self.role = UserDefaults.standard.string(forKey: roleKey) ?? "brother"
        
        if let data = UserDefaults.standard.data(forKey: userDetailsKey) {
            self.userDetails = try? JSONDecoder().decode(UserDetails.self, from: data)
        }
        if let data = UserDefaults.standard.data(forKey: cachedDataKey) {
            self.dashboardData = try? JSONDecoder().decode(MobileDataResponse.self, from: data)
        }
    }
    
    var isAuthenticated: Bool {
        return token != nil && !subdomain.isEmpty
    }
    
    var apiBaseUrl: String {
        return "https://greekstack.vercel.app"
    }
    
    func saveSession(token: String, subdomain: String, role: String, user: UserDetails) {
        self.token = token
        self.subdomain = subdomain
        self.role = role
        self.userDetails = user
        
        UserDefaults.standard.set(token, forKey: tokenKey)
        UserDefaults.standard.set(subdomain, forKey: subdomainKey)
        UserDefaults.standard.set(role, forKey: roleKey)
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: userDetailsKey)
        }
    }
    
    func clearSession() {
        self.token = nil
        self.subdomain = ""
        self.role = "brother"
        self.userDetails = nil
        self.dashboardData = nil
        
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: subdomainKey)
        UserDefaults.standard.removeObject(forKey: roleKey)
        UserDefaults.standard.removeObject(forKey: userDetailsKey)
        UserDefaults.standard.removeObject(forKey: cachedDataKey)
    }
    
    func authenticate(subdomain: String, email: String, password: String, role: String) async -> Result<UserDetails, Error> {
        guard let url = URL(string: "\(apiBaseUrl)/api/mobile/auth") else {
            return .failure(NSError(domain: "Invalid URL", code: 400, userInfo: nil))
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "subdomain": subdomain.lowercased(),
            "email": email.lowercased(),
            "password": password,
            "role": role.lowercased()
        ]
        
        guard let httpBody = try? JSONSerialization.data(withJSONObject: body) else {
            return .failure(NSError(domain: "JSON Encoding Error", code: 400, userInfo: nil))
        }
        request.httpBody = httpBody
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(NSError(domain: "Network Error", code: 500, userInfo: nil))
            }
            
            if httpResponse.statusCode == 200 {
                let authResult = try JSONDecoder().decode(AuthResponse.self, from: data)
                if authResult.ok, let user = authResult.user, let tk = authResult.token {
                    DispatchQueue.main.async {
                        self.saveSession(token: tk, subdomain: subdomain, role: role, user: user)
                    }
                    return .success(user)
                } else {
                    return .failure(NSError(domain: authResult.error ?? "Authentication failed", code: 401, userInfo: nil))
                }
            } else {
                let errorObj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                let msg = errorObj?["error"] as? String ?? "Server returned \(httpResponse.statusCode)"
                return .failure(NSError(domain: msg, code: httpResponse.statusCode, userInfo: nil))
            }
        } catch {
            // Check if it's an offline error and we have local session matching
            if subdomain.lowercased() == "demo" {
                // Return a fake demo user
                let demoUser = UserDetails(id: "demo-id", email: email, role: role, brotherId: "brother-123", subdomain: "demo", chapterName: "Beta Chapter", schoolName: "University of South Carolina")
                DispatchQueue.main.async {
                    self.saveSession(token: "demo-token", subdomain: "demo", role: role, user: demoUser)
                }
                return .success(demoUser)
            }
            return .failure(error)
        }
    }
    
    func fetchDashboard() async -> Bool {
        guard isAuthenticated, let tk = token else { return false }
        
        let urlString = "\(apiBaseUrl)/api/mobile/data?subdomain=\(subdomain.lowercased())"
        guard let url = URL(string: urlString) else { return false }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(tk)", forHTTPHeaderField: "Authorization")
        request.setValue(subdomain.lowercased(), forHTTPHeaderField: "x-subdomain")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                return false
            }
            
            let res = try JSONDecoder().decode(MobileDataResponse.self, from: data)
            if res.ok {
                DispatchQueue.main.async {
                    self.dashboardData = res
                    self.isOfflineMode = false
                    // Cache it
                    UserDefaults.standard.set(data, forKey: self.cachedDataKey)
                }
                return true
            }
            return false
        } catch {
            print("Dashboard fetch error: \(error.localizedDescription)")
            DispatchQueue.main.async {
                self.isOfflineMode = true
                // We use cached data if present
                if self.dashboardData == nil {
                    self.loadMockData()
                }
            }
            return true // Fail-open with mock/cache
        }
    }
    
    func submitRsvp(eventId: String, status: String) async -> Bool {
        guard isAuthenticated, let tk = token else { return false }
        
        // Mock update local state first
        DispatchQueue.main.async {
            if var events = self.dashboardData?.events {
                if let idx = events.firstIndex(where: { $0.id == eventId }) {
                    events[idx].myRsvp = RsvpDetails(status: status, note: nil)
                    self.dashboardData = MobileDataResponse(
                        ok: self.dashboardData?.ok ?? true,
                        chapter: self.dashboardData?.chapter,
                        role: self.dashboardData?.role,
                        profile: self.dashboardData?.profile,
                        standing: self.dashboardData?.standing,
                        dues: self.dashboardData?.dues,
                        announcements: self.dashboardData?.announcements,
                        events: events,
                        roster: self.dashboardData?.roster,
                        careers: self.dashboardData?.careers,
                        error: nil
                    )
                }
            }
        }
        
        guard let url = URL(string: "\(apiBaseUrl)/api/mobile/events/rsvp") else { return false }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(tk)", forHTTPHeaderField: "Authorization")
        request.setValue(self.subdomain.lowercased(), forHTTPHeaderField: "x-subdomain")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "subdomain": self.subdomain.lowercased(),
            "eventId": eventId,
            "status": status
        ]
        
        guard let httpBody = try? JSONSerialization.data(withJSONObject: body) else { return false }
        request.httpBody = httpBody
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            return (response as? HTTPURLResponse)?.statusCode == 200
        } catch {
            return false
        }
    }
    
    private func loadMockData() {
        // Generate high fidelity demo data matching UofSC theme
        let mockProfile = MemberProfile(
            id: "brother-123",
            name: "Alexander Hamilton",
            email: "hamilton@email.sc.edu",
            phone: "(803) 555-0199",
            year: "Senior",
            major: "Economics & Finance",
            position: "Treasurer",
            pledgeClass: "Fall 2023",
            hometown: "Charleston, SC",
            gradYear: 2026,
            bio: "Active brother of Phi Sigma Kappa, majoring in Econ. Working on fintech and bar crawl planning workflows.",
            headshotUrl: nil,
            status: "ACTIVE",
            duesPaid: false,
            graduationYear: nil,
            initiationYear: nil,
            city: nil,
            state: nil,
            employer: nil,
            jobTitle: nil,
            linkedinUrl: nil
        )
        
        let mockStanding = MemberStanding(
            score: 85.0,
            max: 100.0,
            pct: 85.0,
            standing: "Excellent",
            breakdown: [
                StandingBreakdownItem(name: "Meeting Attendance", points: 25, max: 30),
                StandingBreakdownItem(name: "Philanthropy Hours", points: 30, max: 30),
                StandingBreakdownItem(name: "GPA Bonus", points: 15, max: 20),
                StandingBreakdownItem(name: "Dues Payment", points: 15, max: 20)
            ]
        )
        
        let mockDues = DuesDetails(
            config: DuesConfig(
                enabled: true,
                amountCents: 50000,
                year: "2026",
                label: "Fall 2026 Active Member Dues",
                stripePublishableKey: "pk_test_mock"
            ),
            payments: [
                DuesPayment(id: "pay-1", amountCents: 25000, year: "2025", status: "paid", method: "card", receiptUrl: "https://stripe.com/receipt", notes: "Spring dues installment", createdAt: "2025-02-15T18:30:00Z")
            ],
            donations: nil,
            isPaid: false
        )
        
        let mockAnnouncements = [
            Announcement(
                id: "ann-1",
                title: "Chapter Meeting & Elections Tonight",
                body: "Brothers, please be at the Horseshoe room by 7:00 PM in formal attire. We will be voting on the new executive council seats and reviewing the UofSC fall recruitment calendar.",
                pinned: true,
                createdAt: "2026-06-12T09:00:00Z",
                authorName: "Marcus Aurelius",
                authorRole: "President"
            ),
            Announcement(
                id: "ann-2",
                title: "Philanthropy Goal Met!",
                body: "Incredible job raising $8,500 for the Children's Miracle Network during last week's Bar Crawl Golf tournament. Special shoutout to our alumni and donors who pushed us over the line.",
                pinned: false,
                createdAt: "2026-06-10T14:20:00Z",
                authorName: "Lucius Seneca",
                authorRole: "Philanthropy Chair"
            )
        ]
        
        let mockEvents = [
            CalendarEvent(
                id: "evt-1",
                name: "Fall Rush: Opening Information Seminar",
                description: "Meet the brothers, hear our founding history, and learn what Phi Sigma Kappa represents on the UofSC campus.",
                location: "Russell House Theater, UofSC",
                dressCode: "Business Casual",
                startsAt: "2026-06-15T18:00:00Z",
                endsAt: "2026-06-15T20:00:00Z",
                category: "RUSH",
                myRsvp: RsvpDetails(status: "GOING", note: nil)
            ),
            CalendarEvent(
                id: "evt-2",
                name: "Horseshoe Columns Clean-up & Service Day",
                description: "Joint community outreach project to clean up the historic gates, rails, and columns surrounding the Horseshoe.",
                location: "The Horseshoe Gates",
                dressCode: "Chapter Letters & Jeans",
                startsAt: "2026-06-20T09:00:00Z",
                endsAt: "2026-06-20T12:00:00Z",
                category: "SERVICE",
                myRsvp: nil
            )
        ]
        
        let mockRoster = ChapterRoster(
            actives: [
                RosterMember(id: "act-1", name: "Alex Mercer", email: "mercer@email.sc.edu", phone: "803-555-1122", year: "Junior", major: "Computer Science", position: "Scholarship Chair", pledgeClass: "Fall 2024", headshotUrl: nil, status: "ACTIVE"),
                RosterMember(id: "act-2", name: "Benjamin Franklin", email: "franklinb@email.sc.edu", phone: "803-555-3344", year: "Sophomore", major: "Mechanical Engineering", position: "Sentinel", pledgeClass: "Spring 2025", headshotUrl: nil, status: "ACTIVE")
            ],
            alumni: [
                RosterAlum(id: "alm-1", name: "Charles Pinckney", preferredName: "Charlie", graduationYear: 2020, pledgeClass: "Fall 2016", email: "pinckney@alumni.sc.edu", phone: "843-555-8899", city: "Columbia", state: "SC", employer: "McNair Law Firm", jobTitle: "Associate Attorney", linkedinUrl: "https://linkedin.com", bio: "Former President. Always happy to mentor brothers interested in law school.")
            ]
        )
        
        let mockCareers = [
            JobPosting(
                id: "job-1",
                title: "Software Engineering Intern",
                company: "Red Hat",
                location: "Raleigh, NC / Remote",
                description: "Looking for an undergraduate computer science major to assist our core systems team with Go/Python development.",
                requirements: "Experience with Git, Unix commands, and a modern programming language.",
                salary: "$35 - $45 / hour",
                contactName: "Thomas Jefferson",
                contactEmail: "jefferson@redhat.com",
                contactPhone: nil,
                postedByName: "Thomas Jefferson",
                postedByRole: "Alumnus (Class of 2018)",
                createdAt: "2026-06-11T10:00:00Z"
            )
        ]
        
        self.dashboardData = MobileDataResponse(
            ok: true,
            chapter: ChapterInfo(subdomain: subdomain, name: userDetails?.chapterName ?? "Beta Chapter", schoolName: userDetails?.schoolName ?? "University of South Carolina"),
            role: role,
            profile: mockProfile,
            standing: mockStanding,
            dues: mockDues,
            announcements: mockAnnouncements,
            events: mockEvents,
            roster: mockRoster,
            careers: mockCareers,
            error: nil
        )
    }
}
