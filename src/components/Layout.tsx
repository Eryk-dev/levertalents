import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { PageTransition } from "@/components/primitives/PageTransition";
import { CmdKPalette } from "@/components/CmdKPalette";

export function Layout() {
  // Desktop sidebar visibility. State is local (visual-only) — persistence
  // can be wired later (TODO: remember across reloads via localStorage).
  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden">
      {!sidebarHidden && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarHidden((v) => !v)} />
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-linear">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <CmdKPalette />
    </div>
  );
}
