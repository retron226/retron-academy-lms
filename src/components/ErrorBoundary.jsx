import React from 'react';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
                    <div className="rounded-full bg-red-100 p-4 mb-4">
                        <AlertTriangle className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        We encountered an unexpected error. Our team has been notified.
                        Please try reloading the page.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={this.handleReload}>
                            Reload Application
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/'}>
                            Go Home
                        </Button>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 bg-muted rounded text-left text-xs font-mono overflow-auto max-w-lg">
                            <p className="text-red-500 font-bold mb-2">{this.state.error?.toString()}</p>
                            {this.state.error?.stack}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
