import SwiftUI

struct FeedView: View {
    @ObservedObject var apiService = APIService.shared
    @State private var feedSelection = "announcements"
    @State private var selectedAnnouncement: Announcement? = nil
    @State private var selectedJob: JobPosting? = nil
    @State private var isRefreshing = false
    
    var body: some View {
        NavigationView {
            ZStack {
                AppTheme.darkNavy.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 0) {
                    // Custom Header / Brand Crest
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(apiService.dashboardData?.chapter?.name ?? "Chapter Portal")
                                .font(.system(size: 20, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            
                            Text(apiService.dashboardData?.chapter?.schoolName ?? "Greek Stack App")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        
                        Spacer()
                        
                        if apiService.isOfflineMode {
                            HStack(spacing: 4) {
                                Image(systemName: "wifi.slash")
                                Text("Offline")
                            }
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(AppTheme.gold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(AppTheme.gold.opacity(0.15))
                            .cornerRadius(8)
                        }
                    }
                    .padding()
                    .background(AppTheme.navy)
                    
                    // Segment control
                    Picker("Feed Category", selection: $feedSelection) {
                        Text("Announcements").tag("announcements")
                        Text("Careers & Jobs").tag("careers")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding()
                    .background(AppTheme.navy)
                    
                    if feedSelection == "announcements" {
                        announcementsList
                    } else {
                        careersList
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarHidden(true)
            .sheet(item: $selectedAnnouncement) { announcement in
                AnnouncementDetailView(announcement: announcement)
            }
            .sheet(item: $selectedJob) { job in
                JobDetailView(job: job)
            }
        }
    }
    
    private var announcementsList: some View {
        ScrollView {
            RefreshControl(coordinateSpace: .named("feed_scroll")) {
                await refreshData()
            }
            
            VStack(spacing: 16) {
                let items = apiService.dashboardData?.announcements ?? []
                
                if items.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "megaphone.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.white.opacity(0.2))
                        Text("No announcements posted yet.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.top, 100)
                } else {
                    ForEach(items) { item in
                        Button(action: { selectedAnnouncement = item }) {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    if item.pinned {
                                        HStack(spacing: 4) {
                                            Image(systemName: "pin.fill")
                                            Text("PINNED")
                                        }
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(AppTheme.navy)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(AppTheme.gold)
                                        .cornerRadius(4)
                                    }
                                    
                                    Spacer()
                                    
                                    Text(formatDate(item.createdAt))
                                        .font(.system(size: 11))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                
                                Text(item.title)
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(.white)
                                    .multilineTextAlignment(.leading)
                                
                                Text(item.body)
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.7))
                                    .lineLimit(3)
                                    .multilineTextAlignment(.leading)
                                
                                Divider()
                                    .background(Color.white.opacity(0.1))
                                
                                HStack {
                                    Image(systemName: "person.crop.circle.fill")
                                        .foregroundColor(AppTheme.gold)
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(item.authorName)
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(.white)
                                        Text(item.authorRole)
                                            .font(.system(size: 11))
                                            .foregroundColor(AppTheme.skyBlue)
                                    }
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.white.opacity(0.3))
                                }
                            }
                            .padding()
                            .background(AppTheme.glassBackground)
                            .cornerRadius(16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(item.pinned ? AppTheme.gold.opacity(0.6) : AppTheme.glassBorder, lineWidth: 1)
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .coordinateSpace(name: "feed_scroll")
    }
    
    private var careersList: some View {
        ScrollView {
            RefreshControl(coordinateSpace: .named("careers_scroll")) {
                await refreshData()
            }
            
            VStack(spacing: 16) {
                let jobs = apiService.dashboardData?.careers ?? []
                
                if jobs.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "briefcase.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.white.opacity(0.2))
                        Text("No career opportunities available.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.top, 100)
                } else {
                    ForEach(jobs) { job in
                        Button(action: { selectedJob = job }) {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text(job.company)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(AppTheme.gold)
                                    Spacer()
                                    if let sal = job.salary {
                                        Text(sal)
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundColor(.green)
                                    }
                                }
                                
                                Text(job.title)
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                                    .multilineTextAlignment(.leading)
                                
                                HStack(spacing: 4) {
                                    Image(systemName: "mappin.and.ellipse")
                                    Text(job.location)
                                }
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.5))
                                
                                Text(job.description)
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.7))
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                    .padding(.top, 2)
                                
                                if let poster = job.postedByName {
                                    HStack {
                                        Text("Referred by \(poster)")
                                            .font(.system(size: 11, weight: .medium))
                                            .foregroundColor(AppTheme.skyBlue)
                                        if let role = job.postedByRole {
                                            Text("(\(role))")
                                                .font(.system(size: 11))
                                                .foregroundColor(.white.opacity(0.4))
                                        }
                                    }
                                    .padding(.top, 4)
                                }
                            }
                            .padding()
                            .background(AppTheme.glassBackground)
                            .cornerRadius(16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(AppTheme.glassBorder, lineWidth: 1)
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .coordinateSpace(name: "careers_scroll")
    }
    
    private func refreshData() async {
        _ = await apiService.fetchDashboard()
    }
    
    private func formatDate(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateStr) else {
            // Try fallback
            let fallbackFormatter = ISO8601DateFormatter()
            guard let date2 = fallbackFormatter.date(from: dateStr) else {
                return "Recent"
            }
            return date2.timeAgoDisplay()
        }
        return date.timeAgoDisplay()
    }
}

// Custom Sheet Views
struct AnnouncementDetailView: View {
    let announcement: Announcement
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            AppTheme.navy.edgesIgnoringSafeArea(.all)
            
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Spacer()
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text(announcement.title)
                            .font(.system(size: 24, weight: .bold, design: .serif))
                            .foregroundColor(.white)
                        
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Posted by \(announcement.authorName)")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                Text(announcement.authorRole)
                                    .font(.system(size: 12))
                                    .foregroundColor(AppTheme.skyBlue)
                            }
                            Spacer()
                            Text(announcement.createdAt.replacingOccurrences(of: "T", with: " ").prefix(16))
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.4))
                        }
                        .padding()
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(10)
                        
                        Text(announcement.body)
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.85))
                            .lineSpacing(6)
                    }
                }
            }
            .padding()
        }
    }
}

struct JobDetailView: View {
    let job: JobPosting
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            AppTheme.navy.edgesIgnoringSafeArea(.all)
            
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Spacer()
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(job.company)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(AppTheme.gold)
                            Text(job.title)
                                .font(.system(size: 24, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            HStack {
                                Image(systemName: "mappin.and.ellipse")
                                Text(job.location)
                                Spacer()
                                if let sal = job.salary {
                                    Text(sal)
                                        .fontWeight(.bold)
                                        .foregroundColor(.green)
                                }
                            }
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.5))
                        }
                        
                        Divider()
                            .background(Color.white.opacity(0.1))
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Description")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(AppTheme.skyBlue)
                            Text(job.description)
                                .font(.system(size: 15))
                                .foregroundColor(.white.opacity(0.8))
                                .lineSpacing(4)
                        }
                        
                        if let reqs = job.requirements {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Requirements")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(AppTheme.skyBlue)
                                Text(reqs)
                                    .font(.system(size: 15))
                                    .foregroundColor(.white.opacity(0.8))
                                    .lineSpacing(4)
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Referral Information")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(AppTheme.gold)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                if let name = job.contactName {
                                    Text("Contact Name: \(name)")
                                }
                                if let email = job.contactEmail {
                                    Text("Contact Email: \(email)")
                                        .foregroundColor(AppTheme.skyBlue)
                                }
                                if let phone = job.contactPhone {
                                    Text("Contact Phone: \(phone)")
                                }
                            }
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.7))
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(12)
                    }
                }
            }
            .padding()
        }
    }
}

// SwiftUI Pull to refresh helper
struct RefreshControl: View {
    var coordinateSpace: CoordinateSpace
    var onRefresh: () async -> Void
    @State private var needRefresh = false
    
    var body: some View {
        GeometryReader { geo in
            if geo.frame(in: coordinateSpace).midY > 50 {
                Spacer()
                    .onAppear {
                        needRefresh = true
                    }
            } else if geo.frame(in: coordinateSpace).midY < 1 {
                Spacer()
                    .onAppear {
                        if needRefresh {
                            needRefresh = false
                            Task {
                                await onRefresh()
                            }
                        }
                    }
            }
            HStack {
                Spacer()
                if needRefresh {
                    ProgressView()
                }
                Spacer()
            }
        }
        .frame(height: 0)
    }
}

extension Date {
    func timeAgoDisplay() -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: self, relativeTo: Date())
    }
}
