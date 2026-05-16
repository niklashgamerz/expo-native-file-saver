import ExpoModulesCore

// iOS stub — full implementation is Android only
// All functions return a "not supported" error on iOS

public class ExpoPilotModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoPilot")
    Events("onAccessibilityEvent")

    AsyncFunction("isAccessibilityServiceEnabled") { return false }
    AsyncFunction("openAccessibilitySettings") {
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("getServiceStatus") {
      return ["isEnabled": false, "packageName": "", "serviceName": ""]
    }
    AsyncFunction("tap") { (_: [String: Any]) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Cross-app control is not supported on iOS"])
    }
    AsyncFunction("swipe") { (_: [String: Any]) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("scroll") { (_: [String: Any]) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("findElement") { (_: [String: Any]) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("findElements") { (_: [String: Any]) in return [] as [[String: Any]] }
    AsyncFunction("tapElement") { (_: [String: Any]) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("typeText") { (_: [String: Any], _: [String: Any]) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("typeIntoFocused") { (_: [String: Any]) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("waitForElement") { (_: [String: Any], _: Int) throws in
      throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"])
    }
    AsyncFunction("dumpScreen") { return [] as [[String: Any]] }
    AsyncFunction("getCurrentApp") { return ["packageName": "", "className": ""] }
    AsyncFunction("screenshot") { throw NSError(domain: "ExpoPilot", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Not supported on iOS"]) }
    AsyncFunction("pressBack") { return false }
    AsyncFunction("pressHome") { return false }
    AsyncFunction("pressRecents") { return false }
    AsyncFunction("openNotifications") { return false }
    AsyncFunction("openQuickSettings") { return false }
    AsyncFunction("lockScreen") { return false }
    AsyncFunction("launchApp") { (_: String) in return ["success": false] }
    AsyncFunction("getScreenSize") { return ["width": 0, "height": 0, "density": 0] }
    AsyncFunction("getInstalledApps") { return [] as [[String: Any]] }
  }
}
