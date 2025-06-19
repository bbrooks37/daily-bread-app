// src/components/AddVerseModal.tsx
// This component provides the modal overlay and form for users to add new verses,
// now integrating API.Bible dropdowns for verse selection.
import React from 'react';
import '../index.css'; // Import global CSS for styling

// Define props interface for AddVerseModal component
interface AddVerseModalProps {
  showModal: boolean; // Controls the visibility of the modal
  onClose: () => void; // Function to close the modal
  // Existing props for verse text and reference (now mostly for display/final confirmation)
  verseText: string;
  setVerseText: (text: string) => void;
  // Validation errors
  verseTextError: string;
  verseReferenceError: string; // Still used for internal validation, but populated by API
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;

  // New prop for verseReference (which holds the formatted reference for Firestore) - ADDED THIS
  verseReference: string;

  // New props for API.Bible integration
  bibles: { id: string; name: string }[]; // List of available Bibles
  selectedBibleId: string; // Currently selected Bible ID
  onBibleChange: (id: string) => void; // Handler for Bible selection change

  books: { id: string; name: string }[]; // List of books for the selected Bible
  selectedBookId: string; // Currently selected Book ID
  onBookChange: (id: string) => void; // Handler for Book selection change

  chapters: { id: string; number: string }[]; // List of chapters for the selected Book
  selectedChapterId: string; // Currently selected Chapter ID
  onChapterChange: (id: string) => void; // Handler for Chapter selection change

  // Loading states for API calls
  isLoadingBibles: boolean;
  isLoadingBooks: boolean;
  isLoadingChapters: boolean;
  isLoadingVerseContent: boolean; // New: for fetching actual verse text
}

const AddVerseModal: React.FC<AddVerseModalProps> = ({
  showModal,
  onClose,
  verseText,
  setVerseText,
  verseTextError,
  verseReferenceError,
  isSubmitting,
  onSubmit,
  verseReference, // Destructure the newly added prop
  bibles,
  selectedBibleId,
  onBibleChange,
  books,
  selectedBookId,
  onBookChange,
  chapters,
  selectedChapterId,
  onChapterChange,
  isLoadingBibles,
  isLoadingBooks,
  isLoadingChapters,
  isLoadingVerseContent,
}) => {
  if (!showModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button
          onClick={onClose}
          className="modal-close-button"
          aria-label="Close modal"
        >
          &times;
        </button>
        <h2 className="modal-title">Add Your Daily Verse</h2>
        <form onSubmit={onSubmit} className="modal-form">
          {/* Bible Selection */}
          <div className="form-group">
            <label htmlFor="bibleSelect" className="form-label">Select Bible Version:</label>
            <select
              id="bibleSelect"
              className="form-input"
              value={selectedBibleId}
              onChange={(e) => onBibleChange(e.target.value)}
              disabled={isLoadingBibles || bibles.length === 0}
            >
              {isLoadingBibles && <option value="">Loading Bibles...</option>}
              {!isLoadingBibles && bibles.length === 0 && <option value="">No Bibles found</option>}
              {bibles.map((bible) => (
                <option key={bible.id} value={bible.id}>
                  {bible.name}
                </option>
              ))}
            </select>
          </div>

          {/* Book Selection */}
          <div className="form-group">
            <label htmlFor="bookSelect" className="form-label">Select Book:</label>
            <select
              id="bookSelect"
              className="form-input"
              value={selectedBookId}
              onChange={(e) => onBookChange(e.target.value)}
              disabled={!selectedBibleId || isLoadingBooks || books.length === 0}
            >
              <option value="">{isLoadingBooks ? 'Loading Books...' : 'Select a Book'}</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Selection */}
          <div className="form-group">
            <label htmlFor="chapterSelect" className="form-label">Select Chapter:</label>
            <select
              id="chapterSelect"
              className="form-input"
              value={selectedChapterId}
              onChange={(e) => onChapterChange(e.target.value)}
              disabled={!selectedBookId || isLoadingChapters || chapters.length === 0}
            >
              <option value="">{isLoadingChapters ? 'Loading Chapters...' : 'Select a Chapter'}</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.number}
                </option>
              ))}
            </select>
            {verseReferenceError && <p className="error-message">{verseReferenceError}</p>}
          </div>

          {/* Verse Text Area (pre-filled by API) */}
          <div className="form-group">
            <label htmlFor="verseText" className="form-label">Verse Text:</label>
            <textarea
              id="verseText"
              value={isLoadingVerseContent ? 'Loading verse content...' : verseText}
              onChange={(e) => {
                setVerseText(e.target.value);
              }}
              placeholder="Verse content will appear here once selected..."
              className={`form-textarea ${verseTextError ? 'input-error' : ''}`}
              required
              readOnly={isLoadingVerseContent} // Prevent manual editing while loading
              aria-invalid={!!verseTextError}
              aria-describedby={verseTextError ? 'verse-text-error' : undefined}
            ></textarea>
            {verseTextError && <p id="verse-text-error" className="error-message">{verseTextError}</p>}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || isLoadingVerseContent || !selectedChapterId || !verseText.trim()}
          >
            {isSubmitting ? 'Submitting Verse...' : 'Submit Verse'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddVerseModal;
