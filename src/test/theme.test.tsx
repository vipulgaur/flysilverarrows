import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const { log } = vi.hoisted(() => ({ log: vi.fn() }));
vi.mock("@/lib/store", () => ({ useStore: () => ({ log }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); log.mockClear(); document.documentElement.classList.remove("dark"); });

describe("Appearance preference", () => {
  const setup = () => render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
  it("toggles both appearances and saves the selected mode", () => {
    setup();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("silverarrows-theme")).toBe("light");
    expect(log).toHaveBeenCalledWith("appearance_changed", "user", "Switched to light appearance");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("silverarrows-theme")).toBe("dark");
  });
  it("restores a saved light preference", () => {
    localStorage.setItem("silverarrows-theme", "light");
    setup();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
  it("keeps the toggle usable when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
    setup();
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});