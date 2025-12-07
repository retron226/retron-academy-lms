import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import Footer from "./Footer";

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
            <main className="flex-1 overflow-y-auto p-8 transition-all duration-300">
                <Outlet />
                <div className="mt-8">
                    <Footer />
                </div>
            </main>
        </div>
    );
}
