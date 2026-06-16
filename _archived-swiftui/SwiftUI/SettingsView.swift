import SwiftUI
import LocalAuthentication

struct SettingsView: View {
    @ObservedObject var apiService = APIService.shared
    @State private var enableBiometrics = false
    @State private var notificationsEnabled = true
    @State private var showWebView = false
    
    private let biometricsKey = "gs_enable_biometric_unlock"
    
    init() {
        _enableBiometrics = State(initialValue: UserDefaults.standard.bool(forKey: biometricsKey))
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                AppTheme.darkNavy.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 0) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Member Settings")
                                .font(.system(size: 20, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            
                            Text("Profile & Device Preferences")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        Spacer()
                    }
                    .padding()
                    .background(AppTheme.navy)
                    
                    ScrollView {
                        VStack(spacing: 20) {
                            profileCard
                            
                            deviceSettingsCard
                            
                            portalSettingsCard
                            
                            signOutButton
                        }
                        .padding()
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showWebView) {
                CapacitorSheetView()
            }
        }
    }
    
    private var profileCard: some View {
        AppTheme.Card {
            if let profile = apiService.dashboardData?.profile {
                VStack(spacing: 16) {
                    HStack(spacing: 16) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(AppTheme.gold)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(profile.name)
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                            
                            Text(profile.email)
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.5))
                            
                            if let pos = profile.position, !pos.isEmpty {
                                Text(pos)
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(AppTheme.gold)
                            }
                        }
                        Spacer()
                    }
                    
                    Divider()
                        .background(Color.white.opacity(0.1))
                    
                    // Profile Stats
                    HStack {
                        profileStat(label: "Pledge Class", value: profile.pledgeClass ?? "N/A")
                        Spacer()
                        profileStat(label: "Year / Class", value: profile.year ?? (profile.graduationYear != nil ? "Class of \(profile.graduationYear!)" : "N/A"))
                        Spacer()
                        profileStat(label: "Hometown", value: profile.hometown ?? profile.city ?? "N/A")
                    }
                }
            } else {
                Text("No profile data available.")
                    .foregroundColor(.white.opacity(0.4))
            }
        }
    }
    
    private var deviceSettingsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("DEVICE PREFERENCES")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white.opacity(0.5))
                .padding(.horizontal, 4)
            
            AppTheme.Card {
                VStack(spacing: 14) {
                    // Biometrics toggle
                    Toggle(isOn: $enableBiometrics) {
                        HStack(spacing: 12) {
                            Image(systemName: "faceid")
                                .font(.system(size: 18))
                                .foregroundColor(AppTheme.gold)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Face ID / Touch ID")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Secure biometric unlock on launch")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                    }
                    .onChange(of: enableBiometrics) { newValue in
                        UserDefaults.standard.set(newValue, forKey: biometricsKey)
                        if newValue {
                            requestBiometricVerification()
                        }
                    }
                    .toggleStyle(SwitchToggleStyle(tint: AppTheme.gold))
                    
                    Divider()
                        .background(Color.white.opacity(0.1))
                    
                    // Notifications
                    Toggle(isOn: $notificationsEnabled) {
                        HStack(spacing: 12) {
                            Image(systemName: "bell.fill")
                                .font(.system(size: 18))
                                .foregroundColor(AppTheme.skyBlue)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Push Notifications")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Announcements and meeting alerts")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                    }
                    .toggleStyle(SwitchToggleStyle(tint: AppTheme.gold))
                }
            }
        }
    }
    
    private var portalSettingsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("CHAPTER SYSTEMS")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white.opacity(0.5))
                .padding(.horizontal, 4)
            
            AppTheme.Card {
                VStack(spacing: 14) {
                    // Launch Web App
                    Button(action: { showWebView = true }) {
                        HStack {
                            Image(systemName: "safari.fill")
                                .font(.system(size: 18))
                                .foregroundColor(AppTheme.gold)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Open Full Chapter Portal")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Access custom forms and recruitment admin")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.3))
                        }
                    }
                    
                    Divider()
                        .background(Color.white.opacity(0.1))
                    
                    // Support
                    Button(action: {
                        if let url = URL(string: "mailto:support@greekstack.com?subject=Greek%20Stack%20iOS%20Help") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack {
                            Image(systemName: "questionmark.circle.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.green)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Contact Developer Support")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Get help or report a bugs/issues")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.3))
                        }
                    }
                }
            }
        }
    }
    
    private var signOutButton: some View {
        Button(action: {
            apiService.clearSession()
        }) {
            Text("Sign Out of Chapter")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.red)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red.opacity(0.1))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.red.opacity(0.2), lineWidth: 1)
                )
        }
    }
    
    private func profileStat(label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white.opacity(0.4))
            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
        }
    }
    
    private func requestBiometricVerification() {
        let context = LAContext()
        var error: NSError?
        
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Confirm biometric credentials for Greek Stack.") { success, evalError in
                if !success {
                    DispatchQueue.main.async {
                        self.enableBiometrics = false
                        UserDefaults.standard.set(false, forKey: self.biometricsKey)
                    }
                }
            }
        } else {
            self.enableBiometrics = false
            UserDefaults.standard.set(false, forKey: self.biometricsKey)
        }
    }
}

struct CapacitorSheetView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            CapacitorWebView()
                .edgesIgnoringSafeArea(.all)
                .navigationBarTitle("Chapter Portal", displayMode: .inline)
                .navigationBarItems(leading: Button("Done") {
                    presentationMode.wrappedValue.dismiss()
                })
        }
    }
}
