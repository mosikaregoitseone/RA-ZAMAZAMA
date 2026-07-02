// src/components/ErrorNotification.tsx
"use client";

import { useEffect, useState } from "react";

interface ErrorNotificationProps {
  message: string;
  onClose: () => void;
  type?: "error" | "success" | "info" | "warning";
  duration?: number;
}

export function ErrorNotification({
  message,
  onClose,
  type = "error",
  duration = 5000,
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (!isVisible) return null;

  const bgColorMap = {
    error: "bg-red-100 border-red-400 text-red-700",
    success: "bg-green-100 border-green-400 text-green-700",
    info: "bg-blue-100 border-blue-400 text-blue-700",
    warning: "bg-yellow-100 border-yellow-400 text-yellow-700",
  };

  const iconMap = {
    error: "❌",
    success: "✅",
    info: "ℹ️",
    warning: "⚠️",
  };

  return (
    <div
      className={`fixed top-4 right-4 border rounded-lg px-4 py-3 z-50 max-w-md shadow-lg ${bgColorMap[type]} animate-fade-in`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{iconMap[type]}</span>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="flex-shrink-0 text-lg leading-none hover:opacity-70"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Hook to manage error state
export function useNotification() {
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "info" | "warning";
  } | null>(null);

  const showError = (message: string) => {
    setNotification({ message, type: "error" });
  };

  const showSuccess = (message: string) => {
    setNotification({ message, type: "success" });
  };

  const showInfo = (message: string) => {
    setNotification({ message, type: "info" });
  };

  const showWarning = (message: string) => {
    setNotification({ message, type: "warning" });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showError,
    showSuccess,
    showInfo,
    showWarning,
    clearNotification,
  };
}