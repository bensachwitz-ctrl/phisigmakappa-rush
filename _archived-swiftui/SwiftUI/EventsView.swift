import SwiftUI

struct EventsView: View {
    @ObservedObject var apiService = APIService.shared
    @State private var selectedEvent: CalendarEvent? = nil
    
    var body: some View {
        NavigationView {
            ZStack {
                AppTheme.darkNavy.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 0) {
                    // Custom Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Chapter Calendar")
                                .font(.system(size: 20, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            
                            Text("Upcoming Chapter Events & RSVPs")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        Spacer()
                    }
                    .padding()
                    .background(AppTheme.navy)
                    
                    ScrollView {
                        RefreshControl(coordinateSpace: .named("events_scroll")) {
                            _ = await apiService.fetchDashboard()
                        }
                        
                        VStack(spacing: 16) {
                            let events = apiService.dashboardData?.events ?? []
                            
                            if events.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "calendar.badge.exclamationmark")
                                        .font(.system(size: 40))
                                        .foregroundColor(.white.opacity(0.2))
                                    Text("No upcoming events scheduled.")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                .padding(.top, 100)
                            } else {
                                ForEach(events) { event in
                                    EventCard(event: event)
                                }
                            }
                        }
                        .padding()
                    }
                    .coordinateSpace(name: "events_scroll")
                }
            }
            .navigationBarHidden(true)
        }
    }
}

struct EventCard: View {
    let event: CalendarEvent
    @ObservedObject var apiService = APIService.shared
    @State private var isSubmittingRsvp = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Category, Date & Title
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    if let category = event.category {
                        Text(category.uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(categoryColor(category))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(categoryColor(category).opacity(0.15))
                            .cornerRadius(6)
                    }
                    
                    Spacer()
                    
                    Text(formatEventDate(event.startsAt))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppTheme.gold)
                }
                
                Text(event.name)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
            }
            
            // Event Details
            VStack(alignment: .leading, spacing: 6) {
                if let loc = event.location, !loc.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "mappin.and.ellipse")
                            .foregroundColor(.white.opacity(0.4))
                            .frame(width: 16)
                        Text(loc)
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                
                if let dress = event.dressCode, !dress.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "tag.fill")
                            .foregroundColor(.white.opacity(0.4))
                            .frame(width: 16)
                        Text("Dress: \(dress)")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                
                if let desc = event.description, !desc.isEmpty {
                    Text(desc)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.6))
                        .lineLimit(2)
                        .padding(.top, 4)
                }
            }
            
            // RSVP section
            if apiService.role == "brother" {
                Divider()
                    .background(Color.white.opacity(0.1))
                
                HStack(spacing: 10) {
                    rsvpButton(status: "GOING", title: "Going", icon: "checkmark.circle.fill", activeColor: .green)
                    rsvpButton(status: "MAYBE", title: "Maybe", icon: "questionmark.circle.fill", activeColor: AppTheme.gold)
                    rsvpButton(status: "NOT_GOING", title: "Decline", icon: "xmark.circle.fill", activeColor: .red)
                }
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
    
    private func rsvpButton(status: String, title: String, icon: String, activeColor: Color) -> some View {
        let isSelected = event.myRsvp?.status == status
        
        return Button(action: {
            Task {
                isSubmittingRsvp = true
                _ = await apiService.submitRsvp(eventId: event.id, status: status)
                isSubmittingRsvp = false
            }
        }) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(title)
                    .font(.system(size: 12, weight: .semibold))
            }
            .foregroundColor(isSelected ? .white : .white.opacity(0.4))
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(isSelected ? activeColor : Color.white.opacity(0.04))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? activeColor : Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .disabled(isSubmittingRsvp)
    }
    
    private func categoryColor(_ category: String) -> Color {
        switch category.uppercased() {
        case "RUSH", "RECRUITMENT":
            return AppTheme.gold
        case "SOCIAL":
            return AppTheme.skyBlue
        case "SERVICE", "PHILANTHROPY":
            return .green
        case "MEETING", "CHAPTER":
            return .purple
        default:
            return .gray
        }
    }
    
    private func formatEventDate(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateStr) else {
            let fallbackFormatter = ISO8601DateFormatter()
            guard let date2 = fallbackFormatter.date(from: dateStr) else {
                return dateStr
            }
            return outputDateString(date2)
        }
        return outputDateString(date)
    }
    
    private func outputDateString(_ date: Date) -> String {
        let outFormatter = DateFormatter()
        outFormatter.dateFormat = "MMM d, h:mm a"
        return outFormatter.string(from: date)
    }
}
