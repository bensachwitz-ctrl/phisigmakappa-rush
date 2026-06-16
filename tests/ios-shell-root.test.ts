import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * ── Release-gate guard: the SHIPPED iOS root is the bundled Capacitor shell ───
 * OWNER DECISION: the shipped GS iOS app must be the bundled Capacitor
 * "mobile-shell" webDir (no-login demo, School→Chapter picker, account deletion,
 * exec view, real Stripe dues) — NOT the native SwiftUI app.
 *
 * The custom SwiftUI AppDelegate used to set
 *   window.rootViewController = UIHostingController(ContentView())
 * which bypassed the storyboard and launched the SwiftUI app, making the entire
 * bundled shell dead code. Because `ios/App` is COMMITTED (codemagic uses the
 * committed project; it only runs `cap add ios` if the project is ABSENT), what
 * ships is exactly this tree. These invariants prove the CI archive's root is
 * CAPBridgeViewController loading the bundled webDir.
 */

const ROOT = resolve(__dirname, "..");
const r = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const APP_DELEGATE = r("ios/App/App/AppDelegate.swift");
const PBXPROJ = r("ios/App/App.xcodeproj/project.pbxproj");
const MAIN_STORYBOARD = r("ios/App/App/Base.lproj/Main.storyboard");
const INFO_PLIST = r("ios/App/App/Info.plist");
const ENTITLEMENTS = r("ios/App/App/App.entitlements");
const CAP_CONFIG = r("capacitor.config.ts");

describe("iOS root is the bundled Capacitor shell (council blocker)", () => {
  it("AppDelegate does NOT install a SwiftUI/UIHostingController root", () => {
    // The dead-code override was: rootViewController = UIHostingController(...).
    expect(APP_DELEGATE).not.toContain("UIHostingController");
    expect(APP_DELEGATE).not.toContain("ContentView()");
    expect(APP_DELEGATE).not.toContain("makeKeyAndVisible");
    // It IS the standard Capacitor delegate (storyboard-driven root).
    expect(APP_DELEGATE).toContain("import Capacitor");
    expect(APP_DELEGATE).toContain("ApplicationDelegateProxy.shared");
  });

  it("the storyboard root is CAPBridgeViewController (loads the bundled webDir)", () => {
    expect(MAIN_STORYBOARD).toContain("CAPBridgeViewController");
    expect(MAIN_STORYBOARD).toContain("customModule=\"Capacitor\"");
    // Info.plist points UIKit at the Main storyboard as the app's root.
    expect(INFO_PLIST).toContain("<key>UIMainStoryboardFile</key>");
    expect(INFO_PLIST).toMatch(/<key>UIMainStoryboardFile<\/key>\s*<string>Main<\/string>/);
  });

  it("the SwiftUI sources are NOT compiled into the app target", () => {
    // No SwiftUI view is referenced in the pbxproj (build files, file refs,
    // group, or Sources phase) — they were archived to _archived-swiftui/.
    for (const view of [
      "ContentView.swift",
      "LoginView.swift",
      "FeedView.swift",
      "EventsView.swift",
      "DirectoryView.swift",
      "DuesView.swift",
      "SettingsView.swift",
      "CapacitorWebView.swift",
      "APIService.swift",
    ]) {
      expect(PBXPROJ).not.toContain(view);
    }
    // AppDelegate.swift is the ONLY Swift source compiled. The pbxproj names a
    // "<file>.swift in Sources" twice per compiled file (the PBXBuildFile
    // definition + the PBXSourcesBuildPhase reference), so the default
    // single-source Capacitor project has exactly two such occurrences — both
    // AppDelegate.swift.
    const sourcesMatches = PBXPROJ.match(/\S+\.swift in Sources \*\//g) || [];
    expect(sourcesMatches.length).toBe(2);
    expect(sourcesMatches.every((m) => m.includes("AppDelegate.swift"))).toBe(true);
    expect(PBXPROJ).toContain("AppDelegate.swift in Sources");
  });

  it("the archived SwiftUI source is recoverable (not hard-deleted)", () => {
    expect(existsSync(resolve(ROOT, "_archived-swiftui/SwiftUI/ContentView.swift"))).toBe(true);
    expect(existsSync(resolve(ROOT, "_archived-swiftui/AppDelegate.swift.swiftui-override"))).toBe(true);
  });

  it("capacitor.config serves the bundled mobile-shell webDir with no server.url", () => {
    expect(CAP_CONFIG).toContain("webDir: 'mobile-shell'");
    expect(CAP_CONFIG).not.toMatch(/server\s*:\s*{[^}]*url/);
  });
});

describe("iOS Info.plist / entitlements match actual behavior (Apple 2.3.1 / export compliance)", () => {
  it("declares ITSAppUsesNonExemptEncryption=false (no TestFlight export stall)", () => {
    expect(INFO_PLIST).toMatch(
      /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/,
    );
  });

  it("does NOT declare the unused push background mode or aps-environment", () => {
    // The bundled shell does not use push, so neither the remote-notification
    // background mode nor the aps-environment entitlement may be declared.
    expect(INFO_PLIST).not.toContain("remote-notification");
    expect(INFO_PLIST).not.toContain("UIBackgroundModes");
    expect(ENTITLEMENTS).not.toContain("aps-environment");
    // Associated Domains (universal links) IS a real, used capability — keep it.
    expect(ENTITLEMENTS).toContain("com.apple.developer.associated-domains");
  });
});
