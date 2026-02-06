"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmWord?: string;
  variant?: "default" | "danger";
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  confirmWord,
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isConfirmDisabled = confirmWord
    ? inputValue !== confirmWord || isLoading
    : isLoading;

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog-content" ref={dialogRef}>
        <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>

        <div className="dialog-header">
          {variant === "danger" && (
            <div className="dialog-icon-danger">
              <AlertTriangle size={24} />
            </div>
          )}
          <h3 className="dialog-title">{title}</h3>
          <p className="dialog-description">{description}</p>
        </div>

        {confirmWord && (
          <div className="dialog-input-section">
            <label className="dialog-input-label">
              Type <strong>{confirmWord}</strong> to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              className="dialog-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmWord}
              autoComplete="off"
            />
          </div>
        )}

        <div className="dialog-footer">
          <button className="settings-btn settings-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`settings-btn ${variant === "danger" ? "settings-btn-danger" : "settings-btn-primary"}`}
            onClick={onConfirm}
            disabled={isConfirmDisabled}
          >
            {isLoading ? (
              <span className="btn-loading">
                <span className="btn-spinner" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
