import SwiftUI

struct LoginView: View {
    @ObservedObject var apiService = APIService.shared
    
    @State private var subdomain: String = ""
    @State private var email: String = ""
    @State private var password = ""
    @State private var role: String = "brother"
    
    @State private var isLoading = false
    @State private var errorMessage: String? = nil
    
    var body: some View {
        ZStack {
            // Background
            AppTheme.navy.edgesIgnoringSafeArea(.all)
            
            // Decorative Gradients
            VStack {
                Spacer()
                Circle()
                    .fill(AppTheme.gold.opacity(0.15))
                    .frame(width: 350, height: 350)
                    .blur(radius: 80)
                    .offset(x: 100, y: 150)
            }
            
            VStack {
                Spacer()
                Circle()
                    .fill(AppTheme.skyBlue.opacity(0.1))
                    .frame(width: 300, height: 300)
                    .blur(radius: 70)
                    .offset(x: -120, y: -200)
                Spacer()
            }
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 30) {
                    // Header Logo / Emblem
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(AppTheme.glassBackground)
                                .frame(width: 90, height: 90)
                                .overlay(
                                    Circle()
                                        .stroke(AppTheme.gold, lineWidth: 1.5)
                                )
                                .shadow(color: AppTheme.gold.opacity(0.3), radius: 10)
                            
                            Image("AppLogo")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 62, height: 62)
                                .cornerRadius(14)
                        }
                        .padding(.top, 40)
                        
                        Text("GREEK STACK")
                            .font(.system(size: 26, weight: .bold, design: .serif))
                            .foregroundColor(.white)
                            .tracking(3)
                        
                        Text("Companion iOS Application")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    // Input Card
                    AppTheme.Card {
                        VStack(spacing: 20) {
                            // Role selector tabs
                            HStack(spacing: 0) {
                                Button(action: { role = "brother" }) {
                                    Text("Undergrad Active")
                                        .font(.system(size: 13, weight: .semibold))
                                        .padding(.vertical, 10)
                                        .frame(maxWidth: .infinity)
                                        .background(role == "brother" ? AppTheme.gold : Color.clear)
                                        .foregroundColor(role == "brother" ? AppTheme.navy : .white)
                                        .cornerRadius(8)
                                }
                                
                                Button(action: { role = "alumni" }) {
                                    Text("Alumni Network")
                                        .font(.system(size: 13, weight: .semibold))
                                        .padding(.vertical, 10)
                                        .frame(maxWidth: .infinity)
                                        .background(role == "alumni" ? AppTheme.gold : Color.clear)
                                        .foregroundColor(role == "alumni" ? AppTheme.navy : .white)
                                        .cornerRadius(8)
                                }
                            }
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(10)
                            .padding(.bottom, 5)
                            
                            // Subdomain / Chapter Field
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Chapter Subdomain")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(AppTheme.gold)
                                
                                HStack {
                                    Image(systemName: "house.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("e.g. beta, uofsc", text: $subdomain)
                                        .foregroundColor(.white)
                                        .autocapitalization(.none)
                                        .disableAutocorrection(true)
                                    Text(".greekstack.com")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                .padding()
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                            }
                            
                            // Email Field
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Email Address")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(AppTheme.gold)
                                
                                HStack {
                                    Image(systemName: "envelope.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("name@school.edu", text: $email)
                                        .foregroundColor(.white)
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .disableAutocorrection(true)
                                }
                                .padding()
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Password")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(AppTheme.gold)
                                
                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    SecureField("••••••••", text: $password)
                                        .foregroundColor(.white)
                                }
                                .padding()
                                .background(Color.white.opacity(0.04))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                            }
                            
                            // Error Message
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.red)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal)
                            }
                            
                            // Submit Button
                            Button(action: handleLogin) {
                                HStack {
                                    if isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: AppTheme.navy))
                                    } else {
                                        Text("Sign In Natively")
                                            .font(.system(size: 16, weight: .bold))
                                        Image(systemName: "arrow.right")
                                    }
                                }
                                .foregroundColor(AppTheme.navy)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(AppTheme.goldGradient)
                                .cornerRadius(12)
                                .shadow(color: AppTheme.gold.opacity(0.3), radius: 8, y: 4)
                            }
                            .disabled(isLoading)
                            
                            // Demo login helper
                            Button(action: handleDemoLogin) {
                                Text("Try Sandbox Demo Chapter")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(AppTheme.skyBlue)
                                    .padding(.top, 5)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }
    
    private func handleLogin() {
        guard !subdomain.isEmpty, !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill in all credentials."
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            let result = await apiService.authenticate(subdomain: subdomain, email: email, password: password, role: role)
            DispatchQueue.main.async {
                self.isLoading = false
                switch result {
                case .success(_):
                    break // SwiftUI state will update to show main tabs
                case .failure(let err):
                    self.errorMessage = err.localizedDescription
                }
            }
        }
    }
    
    private func handleDemoLogin() {
        subdomain = "demo"
        email = "member@uofsc-greek.edu"
        password = "password"
        role = "brother"
        handleLogin()
    }
}
