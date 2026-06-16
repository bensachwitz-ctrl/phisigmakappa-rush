import SwiftUI
import Capacitor

struct CapacitorWebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> CAPBridgeViewController {
        // Instantiate the standard Capacitor view controller.
        // It reads capacitor.config.json / capacitor.config.ts settings.
        return CAPBridgeViewController()
    }
    
    func updateUIViewController(_ uiViewController: CAPBridgeViewController, context: Context) {
        // No-op
    }
}
