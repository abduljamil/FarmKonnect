import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console in development
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });

        // You could also log to an error reporting service here
        // e.g., Sentry, LogRocket, etc.
    }

    handleRefresh = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
                        {/* Icon */}
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Something went wrong
                        </h1>

                        {/* Description */}
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
                        </p>

                        {/* Error details (only in development) */}
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left overflow-auto max-h-40">
                                <p className="text-sm font-mono text-red-700 dark:text-red-300">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleRefresh}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                            >
                                <Home className="w-5 h-5" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
