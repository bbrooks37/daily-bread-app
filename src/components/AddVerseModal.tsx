// src/components/AddVerseModal.tsx
// This component provides the modal overlay and form for users to add new verses.
import React from 'react';
import '../index.css'; // Import global CSS for styling

// Define props interface for AddVerseModal component
interface AddVerseModalProps {
  showModal: boolean; // Controls the visibility of the modal
  onClose: () => void; // Function to close the modal
  verseText: string; // Current value of the verse text input
  setVerseText: (text: string) => void; // Setter for verse text state
  verseReference: string; // Current value of the verse reference input
  setVerseReference: (ref: string) => void; // Setter for verse reference state
  verseTextError: string; // Error message for verse text input
  verseReferenceError: string; // Error message for verse reference input
  isSubmitting: boolean; // Indicates if the form is currently being submitted
  onSubmit: (e: React.FormEvent) => void; // Function to handle form submission
}

const AddVerseModal: React.FC<AddVerseModalProps> = ({
  showModal,
  onClose,
  verseText,
  setVerseText,
  verseReference,
  setVerseReference,
  verseTextError,
  verseReferenceError,
  isSubmitting,
  onSubmit,
}) => {
  // If the modal should not be shown, render nothing
  if (!showModal) return null;

  return (
    // Modal overlay to dim the background and center the modal content
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Close button for the modal */}
        <button
          onClick={onClose}
          className="modal-close-button"
          aria-label="Close modal" // Accessibility improvement
        >
          &times;
        </button>
        <h2 className="modal-title">Add Your Daily Verse</h2>
        <form onSubmit={onSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="verseText" className="form-label">Verse Text</label>
            <textarea
              id="verseText"
              value={verseText}
              onChange={(e) => {
                setVerseText(e.target.value);
              }}
              placeholder="e.g., 'For God so loved the world, that he gave his only Son...'"
              // Apply 'input-error' class if there's a validation error
              className={`form-textarea ${verseTextError ? 'input-error' : ''}`}
              required
              aria-invalid={!!verseTextError} // Accessibility improvement
              aria-describedby={verseTextError ? 'verse-text-error' : undefined} // Accessibility improvement
            ></textarea>
            {/* Display verse text error message */}
            {verseTextError && <p id="verse-text-error" className="error-message">{verseTextError}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="verseReference" className="form-label">Verse Reference</label>
            <input
              type="text"
              id="verseReference"
              value={verseReference}
              onChange={(e) => {
                setVerseReference(e.target.value);
              }}
              placeholder="e.g., John 3:16 (KJV)"
              // Apply 'input-error' class if there's a validation error
              className={`form-input ${verseReferenceError ? 'input-error' : ''}`}
              required
              aria-invalid={!!verseReferenceError} // Accessibility improvement
              aria-describedby={verseReferenceError ? 'verse-reference-error' : undefined} // Accessibility improvement
            />
            {/* Display verse reference error message */}
            {verseReferenceError && <p id="verse-reference-error" className="error-message">{verseReferenceError}</p>}
          </div>
          {/* Submit button, disabled when submitting */}
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting Verse...' : 'Submit Verse'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddVerseModal;
