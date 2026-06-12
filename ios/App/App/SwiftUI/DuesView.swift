import SwiftUI

struct DuesView: View {
    @ObservedObject var apiService = APIService.shared
    @State private var isPaying = false
    @State private var paymentSuccess = false
    
    var body: some View {
        NavigationView {
            ZStack {
                AppTheme.darkNavy.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 0) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(apiService.role == "brother" ? "Financial Standing" : "Alumni Giving")
                                .font(.system(size: 20, weight: .bold, design: .serif))
                                .foregroundColor(.white)
                            
                            Text(apiService.role == "brother" ? "Member Dues & Standing Card" : "Contributions Ledger")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        Spacer()
                    }
                    .padding()
                    .background(AppTheme.navy)
                    
                    ScrollView {
                        RefreshControl(coordinateSpace: .named("dues_scroll")) {
                            _ = await apiService.fetchDashboard()
                        }
                        
                        VStack(spacing: 20) {
                            if apiService.role == "brother" {
                                brotherFinancialsView
                            } else {
                                alumniGivingView
                            }
                        }
                        .padding()
                    }
                    .coordinateSpace(name: "dues_scroll")
                }
            }
            .navigationBarHidden(true)
        }
    }
    
    private var brotherFinancialsView: some View {
        VStack(spacing: 20) {
            // Standing card
            if let standing = apiService.dashboardData?.standing {
                AppTheme.Card {
                    VStack(spacing: 12) {
                        HStack {
                            Text("MEMBER STANDING")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(AppTheme.gold)
                            Spacer()
                            Text(standing.standing.uppercased())
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(standingColor(standing.standing))
                        }
                        
                        HStack(alignment: .lastTextBaseline) {
                            Text("\(Int(standing.score))")
                                .font(.system(size: 44, weight: .black))
                                .foregroundColor(.white)
                            Text("/ \(Int(standing.max)) pts")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white.opacity(0.5))
                            Spacer()
                            Text("\(Int(standing.pct))%")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(standingColor(standing.standing))
                        }
                        
                        // Progress bar
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.white.opacity(0.06))
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(standingColor(standing.standing))
                                    .frame(width: geo.size.width * CGFloat(standing.pct / 100.0))
                            }
                        }
                        .frame(height: 8)
                        .padding(.vertical, 4)
                        
                        if let breakdown = standing.breakdown {
                            VStack(spacing: 6) {
                                ForEach(breakdown) { item in
                                    HStack {
                                        Text(item.name)
                                            .font(.system(size: 12))
                                            .foregroundColor(.white.opacity(0.6))
                                        Spacer()
                                        Text("\(Int(item.points))/\(Int(item.max))")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.white)
                                    }
                                }
                            }
                            .padding(.top, 6)
                        }
                    }
                }
            }
            
            // Dues Card
            if let dues = apiService.dashboardData?.dues {
                let isPaid = dues.isPaid ?? false
                let amount = Double(dues.config?.amountCents ?? 0) / 100.0
                
                AppTheme.Card {
                    VStack(spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(dues.config?.label ?? "Active Member Dues")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Billing Cycle: \(dues.config?.year ?? "2026")")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                            Spacer()
                            
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(isPaid ? Color.green : Color.red)
                                    .frame(width: 8, height: 8)
                                Text(isPaid ? "PAID" : "UNPAID")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(isPaid ? .green : .red)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(isPaid ? Color.green.opacity(0.15) : Color.red.opacity(0.15))
                            .cornerRadius(8)
                        }
                        
                        if !isPaid {
                            HStack {
                                Text("Amount Due:")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.6))
                                Spacer()
                                Text(String(format: "$%.2f", amount))
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .padding(.vertical, 8)
                            
                            if paymentSuccess {
                                HStack {
                                    Image(systemName: "checkmark.seal.fill")
                                    Text("Payment Simulated Successfully!")
                                }
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.green)
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(Color.green.opacity(0.1))
                                .cornerRadius(10)
                            } else {
                                Button(action: simulatePayment) {
                                    HStack {
                                        if isPaying {
                                            ProgressView()
                                                .progressViewStyle(CircularProgressViewStyle(tint: AppTheme.navy))
                                        } else {
                                            Image(systemName: "creditcard.fill")
                                            Text("Simulate Dues Payment")
                                                .font(.system(size: 15, weight: .bold))
                                        }
                                    }
                                    .foregroundColor(AppTheme.navy)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(AppTheme.goldGradient)
                                    .cornerRadius(12)
                                }
                                .disabled(isPaying)
                            }
                        } else {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Your account is in good standing. First rush cycle and month are free.")
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.green.opacity(0.08))
                            .cornerRadius(10)
                        }
                    }
                }
                
                // Payment History Ledger
                VStack(alignment: .leading, spacing: 12) {
                    Text("Payment History")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white.opacity(0.7))
                        .padding(.horizontal, 4)
                    
                    let payments = dues.payments ?? []
                    if payments.isEmpty {
                        Text("No recent payments found.")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.4))
                            .padding(.horizontal, 4)
                    } else {
                        ForEach(payments) { payment in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(payment.year)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                    Text("via \(payment.method.uppercased())")
                                        .font(.system(size: 11))
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(String(format: "$%.2f", Double(payment.amountCents) / 100.0))
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                    Text(payment.status.uppercased())
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(.green)
                                }
                            }
                            .padding()
                            .background(AppTheme.glassBackground)
                            .cornerRadius(12)
                        }
                    }
                }
            }
        }
    }
    
    private var alumniGivingView: some View {
        VStack(alignment: .leading, spacing: 20) {
            // General Alumni welcome card
            AppTheme.Card {
                VStack(alignment: .leading, spacing: 10) {
                    Text("THANK YOU FOR YOUR SUPPORT")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(AppTheme.gold)
                    
                    Text("Your contributions help fund chapter activities, historical renovations of the Horseshoe gates, and scholarship rewards for high-standing undergraduate brothers.")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.8))
                        .lineSpacing(4)
                }
            }
            
            // Donation History
            VStack(alignment: .leading, spacing: 12) {
                Text("Your Recorded Donations")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white.opacity(0.7))
                    .padding(.horizontal, 4)
                
                let donations = apiService.dashboardData?.dues?.donations ?? []
                if donations.isEmpty {
                    Text("No recorded donations. Tap 'Donate' in browser to make your first contribution.")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.horizontal, 4)
                } else {
                    ForEach(donations) { don in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(don.campaign)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                Text("Recorded: \(don.recordedAt.prefix(10))")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(String(format: "$%.2f", Double(don.amountCents) / 100.0))
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                Text(don.status.uppercased())
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.green)
                            }
                        }
                        .padding()
                        .background(AppTheme.glassBackground)
                        .cornerRadius(12)
                    }
                }
            }
        }
    }
    
    private func simulatePayment() {
        isPaying = true
        
        // Simulate networking delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isPaying = false
            paymentSuccess = true
            
            // Simulate local state modification
            if var dues = apiService.dashboardData?.dues {
                let currentCents = dues.config?.amountCents ?? 50000
                let newPayment = DuesPayment(
                    id: "pay-simulated",
                    amountCents: currentCents,
                    year: dues.config?.year ?? "2026",
                    status: "paid",
                    method: "card",
                    receiptUrl: "https://stripe.com/mock",
                    notes: "Simulated native payment",
                    createdAt: ISO8601DateFormatter().string(from: Date())
                )
                
                var payments = dues.payments ?? []
                payments.insert(newPayment, at: 0)
                
                apiService.dashboardData = MobileDataResponse(
                    ok: apiService.dashboardData?.ok ?? true,
                    chapter: apiService.dashboardData?.chapter,
                    role: apiService.dashboardData?.role,
                    profile: apiService.dashboardData?.profile,
                    standing: apiService.dashboardData?.standing,
                    dues: DuesDetails(config: dues.config, payments: payments, donations: dues.donations, isPaid: true),
                    announcements: apiService.dashboardData?.announcements,
                    events: apiService.dashboardData?.events,
                    roster: apiService.dashboardData?.roster,
                    careers: apiService.dashboardData?.careers,
                    error: nil
                )
            }
        }
    }
    
    private func standingColor(_ standing: String) -> Color {
        switch standing.lowercased() {
        case "excellent", "good":
            return .green
        case "warning":
            return AppTheme.gold
        case "probation", "suspended":
            return .red
        default:
            return .gray
        }
    }
}
