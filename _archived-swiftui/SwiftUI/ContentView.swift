import SwiftUI
import LocalAuthentication

struct ContentView: View {
    @ObservedObject var apiService = APIService.shared
    @State private var selectedTab = 0
    @State private var isBiometricLocked = false
    @State private var isUnlocking = false
    
    private let biometricsKey = "gs_enable_biometric_unlock"
    
    var body: some View {
        ZStack {
            if !apiService.isAuthenticated {
                LoginView()
            } else if isBiometricLocked {
                biometricLockView
            } else {
                tabbedMainView
            }
        }
        .onAppear {
            checkBiometricLock()
            if apiService.isAuthenticated {
                Task {
                    _ = await apiService.fetchDashboard()
                }
            }
        }
        .onChange(of: apiService.isAuthenticated) { authenticated in
            if authenticated {
                checkBiometricLock()
                Task {
                    _ = await apiService.fetchDashboard()
                }
            }
        }
    }
    
    private var tabbedMainView: some View {
        TabView(selection: $selectedTab) {
            FeedView()
                .tabItem {
                    Label("Feed", systemImage: "megaphone.fill")
                }
                .tag(0)
            
            EventsView()
                .tabItem {
                    Label("Events", systemImage: "calendar")
                }
                .tag(1)
            
            DirectoryView()
                .tabItem {
                    Label("Roster", systemImage: "person.3.fill")
                }
                .tag(2)
            
            DuesView()
                .tabItem {
                    Label("Standing", systemImage: "creditcard.fill")
                }
                .tag(3)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(4)
        }
        .accentColor(AppTheme.gold)
        .onAppear {
            // Customize tab bar appearance
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = AppTheme.uiNavy
            
            UITabBar.appearance().standardAppearance = appearance
            if #available(iOS 15.0, *) {
                UITabBar.appearance().scrollEdgeAppearance = appearance
            }
        }
    }
    
    private var biometricLockView: some View {
        ZStack {
            AppTheme.navy.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 24) {
                Spacer()
                
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 80))
                    .foregroundColor(AppTheme.gold)
                    .shadow(color: AppTheme.gold.opacity(0.3), radius: 10)
                
                VStack(spacing: 8) {
                    Text("Greek Stack Locked")
                        .font(.system(size: 24, weight: .bold, design: .serif))
                        .foregroundColor(.white)
                    
                    Text("Unlock with Face ID to access your chapter.")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                
                Spacer()
                
                Button(action: evaluateBiometrics) {
                    HStack {
                        Image(systemName: "faceid")
                        Text("Unlock App")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundColor(AppTheme.navy)
                    .padding()
                    .frame(maxWidth: 200)
                    .background(AppTheme.goldGradient)
                    .cornerRadius(12)
                }
                .disabled(isUnlocking)
                .padding(.bottom, 60)
            }
        }
    }
    
    private func checkBiometricLock() {
        let isEnabled = UserDefaults.standard.bool(forKey: biometricsKey)
        if apiService.isAuthenticated && isEnabled {
            isBiometricLocked = true
            evaluateBiometrics()
        } else {
            isBiometricLocked = false
        }
    }
    
    private func evaluateBiometrics() {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            isBiometricLocked = false
            return
        }
        
        isUnlocking = true
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock Greek Stack") { success, evalError in
            DispatchQueue.main.async {
                self.isUnlocking = false
                if success {
                    self.isBiometricLocked = false
                }
            }
        }
    }
}
