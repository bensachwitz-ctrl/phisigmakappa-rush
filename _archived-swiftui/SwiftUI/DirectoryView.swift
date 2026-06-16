import SwiftUI

struct DirectoryView: View {
    @ObservedObject var apiService = APIService.shared
    @State private var rosterSelection = "actives"
    @State private var searchText = ""
    @State private var selectedActive: RosterMember? = nil
    @State private var selectedAlum: RosterAlum? = nil
    
    var body: some View {
        NavigationView {
            ZStack {
                AppTheme.darkNavy.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 0) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Chapter Directory")
                                .font(.system(size: 20, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            
                            Text("Active Roster & Alumni Network")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        Spacer()
                    }
                    .padding()
                    .background(AppTheme.navy)
                    
                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.white.opacity(0.4))
                        TextField("Search names, majors, years...", text: $searchText)
                            .foregroundColor(.white)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.white.opacity(0.4))
                            }
                        }
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
                    .padding(.horizontal)
                    .padding(.top, 10)
                    .background(AppTheme.navy)
                    
                    // Segment control
                    Picker("Roster Group", selection: $rosterSelection) {
                        Text("Active Brothers").tag("actives")
                        Text("Alumni Network").tag("alumni")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding()
                    .background(AppTheme.navy)
                    
                    if rosterSelection == "actives" {
                        activesList
                    } else {
                        alumniList
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(item: $selectedActive) { active in
                ActiveMemberDetailView(member: active)
            }
            .sheet(item: $selectedAlum) { alum in
                AlumDetailView(alum: alum)
            }
        }
    }
    
    private var activesList: some View {
        ScrollView {
            RefreshControl(coordinateSpace: .named("actives_scroll")) {
                _ = await apiService.fetchDashboard()
            }
            
            VStack(spacing: 12) {
                let actives = apiService.dashboardData?.roster?.actives ?? []
                let filtered = actives.filter { member in
                    searchText.isEmpty ||
                    member.name.localizedCaseInsensitiveContains(searchText) ||
                    (member.major ?? "").localizedCaseInsensitiveContains(searchText) ||
                    (member.position ?? "").localizedCaseInsensitiveContains(searchText)
                }
                
                if filtered.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.3.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.white.opacity(0.2))
                        Text("No active brothers found matching your search.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.top, 80)
                } else {
                    ForEach(filtered) { member in
                        Button(action: { selectedActive = member }) {
                            HStack(spacing: 16) {
                                // Mock Headshot or system icon
                                Image(systemName: "person.crop.rectangle.fill")
                                    .font(.system(size: 44))
                                    .foregroundColor(AppTheme.gold)
                                    .frame(width: 44, height: 44)
                                    .background(Color.white.opacity(0.04))
                                    .cornerRadius(8)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(member.name)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                    
                                    HStack(spacing: 6) {
                                        if let pos = member.position, !pos.isEmpty {
                                            Text(pos)
                                                .font(.system(size: 11, weight: .semibold))
                                                .foregroundColor(AppTheme.gold)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(AppTheme.gold.opacity(0.15))
                                                .cornerRadius(4)
                                        }
                                        
                                        Text(member.year ?? "Undergrad")
                                            .font(.system(size: 12))
                                            .foregroundColor(.white.opacity(0.5))
                                    }
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.white.opacity(0.3))
                            }
                            .padding()
                            .background(AppTheme.glassBackground)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AppTheme.glassBorder, lineWidth: 1)
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .coordinateSpace(name: "actives_scroll")
    }
    
    private var alumniList: some View {
        ScrollView {
            RefreshControl(coordinateSpace: .named("alumni_scroll")) {
                _ = await apiService.fetchDashboard()
            }
            
            VStack(spacing: 12) {
                let alumni = apiService.dashboardData?.roster?.alumni ?? []
                let filtered = alumni.filter { alum in
                    searchText.isEmpty ||
                    alum.name.localizedCaseInsensitiveContains(searchText) ||
                    (alum.employer ?? "").localizedCaseInsensitiveContains(searchText) ||
                    (alum.jobTitle ?? "").localizedCaseInsensitiveContains(searchText) ||
                    (alum.city ?? "").localizedCaseInsensitiveContains(searchText)
                }
                
                if filtered.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.badge.questionmark")
                            .font(.system(size: 40))
                            .foregroundColor(.white.opacity(0.2))
                        Text("No alumni found matching your search.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .padding(.top, 80)
                } else {
                    ForEach(filtered) { alum in
                        Button(action: { selectedAlum = alum }) {
                            HStack(spacing: 16) {
                                Image(systemName: "briefcase.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(AppTheme.skyBlue)
                                    .frame(width: 44, height: 44)
                                    .background(Color.white.opacity(0.04))
                                    .cornerRadius(8)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(alum.name)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        if let title = alum.jobTitle, let emp = alum.employer {
                                            Text("\(title) at \(emp)")
                                                .font(.system(size: 12))
                                                .foregroundColor(.white.opacity(0.7))
                                                .lineLimit(1)
                                        }
                                        Text("Class of \(alum.graduationYear?.description ?? "Alumni")")
                                            .font(.system(size: 11))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.white.opacity(0.3))
                            }
                            .padding()
                            .background(AppTheme.glassBackground)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AppTheme.glassBorder, lineWidth: 1)
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .coordinateSpace(name: "alumni_scroll")
    }
}

struct ActiveMemberDetailView: View {
    let member: RosterMember
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            AppTheme.navy.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 20) {
                // Header / Close button
                HStack {
                    Spacer()
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Banner
                        VStack(spacing: 12) {
                            Image(systemName: "person.crop.rectangle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(AppTheme.gold)
                                .frame(width: 100, height: 100)
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(16)
                            
                            Text(member.name)
                                .font(.system(size: 22, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            
                            if let pos = member.position, !pos.isEmpty {
                                Text(pos)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(AppTheme.navy)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(AppTheme.gold)
                                    .cornerRadius(6)
                            }
                        }
                        
                        // Contact Actions
                        HStack(spacing: 20) {
                            if let phone = member.phone, !phone.isEmpty {
                                contactButton(icon: "phone.fill", label: "Call", action: {
                                    if let url = URL(string: "tel://\(phone.filter("0123456789".contains))") {
                                        UIApplication.shared.open(url)
                                    }
                                })
                            }
                            
                            contactButton(icon: "envelope.fill", label: "Email", action: {
                                if let url = URL(string: "mailto:\(member.email)") {
                                    UIApplication.shared.open(url)
                                }
                            })
                        }
                        
                        // Info Grid
                        VStack(spacing: 12) {
                            infoRow(label: "Pledge Class", value: member.pledgeClass ?? "N/A")
                            infoRow(label: "Major", value: member.major ?? "N/A")
                            infoRow(label: "Year", value: member.year ?? "N/A")
                            infoRow(label: "Status", value: member.status ?? "ACTIVE")
                        }
                        .padding()
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(12)
                    }
                }
            }
            .padding()
        }
    }
    
    private func contactButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                Text(label)
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundColor(.white)
            .padding(.vertical, 10)
            .frame(width: 80)
            .background(Color.white.opacity(0.06))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }
    
    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white.opacity(0.5))
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
        }
        .padding(.vertical, 4)
    }
}

struct AlumDetailView: View {
    let alum: RosterAlum
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            AppTheme.navy.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 20) {
                HStack {
                    Spacer()
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Banner
                        VStack(spacing: 12) {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(AppTheme.skyBlue)
                            
                            Text(alum.name)
                                .font(.system(size: 22, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            
                            if let title = alum.jobTitle, let emp = alum.employer {
                                Text("\(title) at \(emp)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }
                        
                        // Contact Actions
                        HStack(spacing: 20) {
                            if let phone = alum.phone, !phone.isEmpty {
                                contactButton(icon: "phone.fill", label: "Call", action: {
                                    if let url = URL(string: "tel://\(phone.filter("0123456789".contains))") {
                                        UIApplication.shared.open(url)
                                    }
                                })
                            }
                            
                            contactButton(icon: "envelope.fill", label: "Email", action: {
                                if let url = URL(string: "mailto:\(alum.email)") {
                                    UIApplication.shared.open(url)
                                }
                            })
                            
                            if let ln = alum.linkedinUrl, !ln.isEmpty {
                                contactButton(icon: "link", label: "LinkedIn", action: {
                                    if let url = URL(string: ln) {
                                        UIApplication.shared.open(url)
                                    }
                                })
                            }
                        }
                        
                        // Info Grid
                        VStack(spacing: 12) {
                            infoRow(label: "Pledge Class", value: alum.pledgeClass ?? "N/A")
                            infoRow(label: "Graduation Year", value: alum.graduationYear?.description ?? "N/A")
                            if let city = alum.city, let state = alum.state {
                                infoRow(label: "Location", value: "\(city), \(state)")
                            }
                        }
                        .padding()
                        .background(Color.white.opacity(0.04))
                        .cornerRadius(12)
                        
                        if let bio = alum.bio, !bio.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("About Me")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(AppTheme.gold)
                                Text(bio)
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.8))
                                    .lineSpacing(4)
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white.opacity(0.04))
                            .cornerRadius(12)
                        }
                    }
                }
            }
            .padding()
        }
    }
    
    private func contactButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                Text(label)
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundColor(.white)
            .padding(.vertical, 10)
            .frame(width: 80)
            .background(Color.white.opacity(0.06))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }
    
    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white.opacity(0.5))
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
        }
        .padding(.vertical, 4)
    }
}
