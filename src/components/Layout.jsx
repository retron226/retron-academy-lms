import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import Footer from "./Footer";

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <main className="flex-1 h-full overflow-y-auto transition-all duration-300">
                <div className="flex min-h-full flex-col p-8">
                    {/* Page content */}
                    <div className="flex-1">
                        <Outlet />
                    </div>

                    {/* Footer */}
                    <Footer />
                </div>
            </main>
        </div>
    );
}
