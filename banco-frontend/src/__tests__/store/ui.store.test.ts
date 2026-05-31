import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/store/ui.store";

describe("ui.store", () => {
  beforeEach(() => {
    // Reset to defaults
    useUIStore.setState({
      sidebarCollapsed: false,
      theme: "dark",
      notifications: [],
      unreadCount: 0,
    });
  });

  describe("sidebar", () => {
    it("initial state is not collapsed", () => {
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it("setSidebarCollapsed sets the value", () => {
      useUIStore.getState().setSidebarCollapsed(true);
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it("toggleSidebar flips the value", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe("theme", () => {
    it("initial theme is dark", () => {
      expect(useUIStore.getState().theme).toBe("dark");
    });

    it("setTheme changes the theme", () => {
      useUIStore.getState().setTheme("light");
      expect(useUIStore.getState().theme).toBe("light");
    });

    it("toggleTheme switches between dark and light", () => {
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe("light");
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe("dark");
    });
  });

  describe("notifications", () => {
    it("initial notifications are empty", () => {
      expect(useUIStore.getState().notifications).toHaveLength(0);
      expect(useUIStore.getState().unreadCount).toBe(0);
    });

    it("addNotification adds to the list and increments unreadCount", () => {
      useUIStore.getState().addNotification({
        title: "Test",
        message: "Test message",
        type: "info",
      });
      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().unreadCount).toBe(1);
    });

    it("addNotification caps at 20 notifications", () => {
      for (let i = 0; i < 25; i++) {
        useUIStore.getState().addNotification({
          title: `Notif ${i}`,
          message: "msg",
          type: "info",
        });
      }
      expect(useUIStore.getState().notifications.length).toBeLessThanOrEqual(20);
    });

    it("markAllRead sets all notifications as read and resets unreadCount", () => {
      useUIStore.getState().addNotification({ title: "A", message: "a", type: "success" });
      useUIStore.getState().addNotification({ title: "B", message: "b", type: "error" });
      useUIStore.getState().markAllRead();
      const state = useUIStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.notifications.every((n) => n.read)).toBe(true);
    });

    it("clearNotifications empties the list", () => {
      useUIStore.getState().addNotification({ title: "A", message: "a", type: "info" });
      useUIStore.getState().clearNotifications();
      expect(useUIStore.getState().notifications).toHaveLength(0);
      expect(useUIStore.getState().unreadCount).toBe(0);
    });
  });
});
