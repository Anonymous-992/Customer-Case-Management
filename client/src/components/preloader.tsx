import { useEffect, useState } from "react";


export function Preloader() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse delay-75" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500 rounded-full blur-3xl animate-pulse delay-150" />
      </div>

      {/* Main Content */}
      <div className="relative text-center space-y-8 px-4">
        {/* Logo/Icon Section */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 blur-3xl opacity-20 animate-pulse" />
          <div className="relative bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full p-8 shadow-2xl border border-white/20 dark:border-gray-700/50">
            <img
              src="/logo.png"
              alt="AKITO Logo"
              className="w-32 h-32 object-contain animate-bounce"
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AKITO Case Management system
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            Loading your workspace...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto space-y-3">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-white/30 animate-shimmer" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {progress}% Complete
          </p>
        </div>

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
