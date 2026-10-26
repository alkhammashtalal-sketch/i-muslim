import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppViewController() // Capacitor's, with the launch sky behind the page (AppViewController.swift)
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        // Launched from the icon's menu (add-on 0072-add30 §3): its page once the page has appeared (QuickActions).
        if let item = connectionOptions.shortcutItem, let url = QuickActions.url(item) { QuickActions.deliver(url) }
    }

    /// The icon's menu while the app is running (QuickActions.swift).
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        guard let url = QuickActions.url(shortcutItem) else { return completionHandler(false) }
        QuickActions.deliver(url)
        completionHandler(true)
    }

    /// The menu's titles in the app's language as it is now, set again as the app leaves the screen (Apple's advice for
    /// dynamic quick actions).
    func sceneWillResignActive(_ scene: UIScene) {
        QuickActions.install()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
