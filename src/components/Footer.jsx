import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="border-t bg-background py-6 mt-auto">
            <div className="container flex flex-col items-center justify-between gap-4 md:flex-row md:items-center px-4 md:px-6">
                <p className="text-center text-sm text-muted-foreground md:text-left">
                    &copy; {new Date().getFullYear()} Retron Academy. All rights reserved.
                </p>
                <nav className="flex gap-4 text-sm font-medium text-muted-foreground">
                    <Link to="/terms" className="hover:underline hover:text-foreground">
                        Terms of Service
                    </Link>
                    <Link to="/privacy" className="hover:underline hover:text-foreground">
                        Privacy Policy
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
