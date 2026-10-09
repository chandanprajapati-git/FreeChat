import React from "react";
import { Avatar } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { IconButton } from "@mui/material";

// You will also need AvatarPhoto if it's imported in ChatHome.jsx.
// Assuming AvatarPhoto is exported or you can pass it as a prop or render it inline.
// For simplicity, we'll assume it's passed as a child or you have access to it, 
// but since it's defined in ChatHome, you might want to pass the component itself or just the image URL.
// We'll use a standard img tag for the profile picture if AvatarPhoto isn't available globally.

export default function Profile({
  open,
  onClose,
  myProfileImage,
  profileName,
  onChangePhoto,
  isAnonymous,
  saveProfileVisibility,
  savingPrivacy,
  saveProfileStatus,
  statusDraft,
  setStatusDraft,
  myStatus,
  savingStatus,
  statusError,
  phoneError,
  savePhoneNumber,
  phoneDraft,
  setPhoneDraft,
}) {
  if (!open) return null;

  return (
    <div
      className="contact-picker-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="contact-picker phone-setup-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-setup-title"
      >
        <header className="contact-picker-header">
          <div>
            <p className="chat-overline">ACCOUNT</p>
            <h2 id="phone-setup-title">Account settings</h2>
            <p>Manage your photo, status, visibility, and mobile number.</p>
          </div>
          <IconButton
            className="contact-picker-close"
            aria-label="Close account settings"
            onClick={onClose}
          >
            <CloseRounded />
          </IconButton>
        </header>
        <div className="account-photo-setting">
          <Avatar className="account-photo-avatar" src={myProfileImage} alt={profileName}>
            {!myProfileImage && (profileName?.charAt(0)?.toUpperCase() || "?")}
          </Avatar>
          <div className="account-photo-copy">
            <strong>Profile picture</strong>
            <span>Choose and adjust how your photo appears.</span>
          </div>
          <button
            type="button"
            className="account-photo-change"
            onClick={onChangePhoto}
          >
            Change
          </button>
        </div>
        <label className="privacy-switch-row">
          <span>
            <strong>Show my profile</strong>
            <small>
              When off, friends see “Anonymous” with no photo, status, or
              profile details.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={!isAnonymous}
            onChange={saveProfileVisibility}
            disabled={savingPrivacy}
          />
        </label>
        <form className="account-status-form" onSubmit={saveProfileStatus}>
          <label className="account-phone-label" htmlFor="account-status">
            Status
          </label>
          <textarea
            id="account-status"
            className="contact-picker-search account-status-input"
            maxLength={160}
            rows={3}
            placeholder="Share a short status with your friends"
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value)}
          />
          <div className="account-status-footer">
            <small>
              {myStatus
                ? `Current status: ${myStatus.length} characters`
                : ""}{" "}
              · {statusDraft.length}/160
            </small>
            <button
              className="phone-save-button"
              type="submit"
              disabled={savingStatus}
            >
              {savingStatus ? "Saving…" : "Save status"}
            </button>
          </div>
          {statusError && (
            <p className="friend-action-error" role="alert">
              {statusError}
            </p>
          )}
        </form>
        {phoneError && (
          <p className="friend-action-error" role="alert">
            {phoneError}
          </p>
        )}
        <form onSubmit={savePhoneNumber}>
          <label
            className="account-phone-label"
            htmlFor="account-phone-number"
          >
            Mobile number
          </label>
          <input
            id="account-phone-number"
            className="contact-picker-search phone-number-input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Include your country code"
            value={phoneDraft}
            onChange={(event) => setPhoneDraft(event.target.value)}
            required
          />
          <button className="phone-save-button" type="submit">
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
