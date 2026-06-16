import UIKit
import Capacitor

// STANDARD Capacitor AppDelegate (the default `npx cap add ios` produces).
//
// WHY THIS IS THE DEFAULT (and the SwiftUI override was archived):
// The SHIPPED iOS app is the bundled Capacitor "mobile-shell" webDir — the
// no-login School→Chapter picker, themed login, per-chapter dashboard, exec
// view, real Stripe dues, and account deletion. That UI is loaded by the
// storyboard root: Main.storyboard → CAPBridgeViewController → the bundled
// webDir served from capacitor://localhost (capacitor.config.ts webDir:
// 'mobile-shell', no server.url).
//
// This AppDelegate intentionally does NOT create a UIWindow or set a
// rootViewController. With no window set here, UIKit instantiates the
// UIMainStoryboardFile (Info.plist key "Main") as the app's root — i.e. the
// Capacitor bridge view controller. The previous custom AppDelegate created its
// own UIWindow whose root was a SwiftUI hosting controller, which bypassed the
// storyboard and launched the now-dead SwiftUI app instead of the shell. That
// override (and the SwiftUI sources) now live in _archived-swiftui/.
//
// Push notifications: the bundled shell does NOT use push, so the APNs
// device-token relay methods were removed along with the push capability
// (UIBackgroundModes / aps-environment). Re-add both the entitlement AND these
// `didRegisterForRemoteNotificationsWithDeviceToken` relays together if a future
// build actually wires @capacitor/push-notifications.
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch. The root
        // view controller is the storyboard's CAPBridgeViewController (which
        // loads the bundled mobile-shell webDir) — do NOT instantiate a window
        // or SwiftUI root here, or you would override the storyboard.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, etc.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while inactive.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Keep this call so the
        // Capacitor App API can track app url opens (custom-scheme deep links).
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal
        // Links. Keep this call so the Capacitor App API can track them.
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
