// src/components/VerseCard.tsx
// This component displays a single verse, its metadata, and interaction buttons (like/delete).
import React from 'react';
import '../index.css'; // Import global CSS for styling

// Re-declaring interface here for clarity within the component file.
// In a larger project, this would ideally be imported from a shared 'types.ts' file.
interface Verse {
  id: string;
  text: string;
  verseReference: string;
  userId: string;
  timestamp: Date;
  likedBy: string[];
}

// Define props interface for VerseCard component
interface VerseCardProps {
  verse: Verse; // The verse data to display
  userId: string | null; // The ID of the current authenticated user (for checking authorship/likes)
  onLike: (verseId: string, currentLikedBy: string[]) => void; // Callback for liking/unliking a verse
  onDelete: (verseId: string, verseUserId: string) => void; // Callback for deleting a verse
}

const VerseCard: React.FC<VerseCardProps> = ({ verse, userId, onLike, onDelete }) => {
  // Check if the current user has liked this specific verse
  const hasLiked = userId ? verse.likedBy.includes(userId) : false;
  // Check if the current user is the author of this verse
  const isAuthor = userId === verse.userId;

  return (
    <div className="verse-card">
      <div>
        <p className="verse-text">
          "{verse.text}"
        </p>
        <p className="verse-reference">
          - {verse.verseReference}
        </p>
      </div>
      <div className="verse-meta">
        <div className="shared-info">
          Shared by: <span className="shared-user-id">{verse.userId.substring(0, 8)}...</span> <br />
          <span className="shared-timestamp">{verse.timestamp.toLocaleDateString()} at {verse.timestamp.toLocaleTimeString()}</span>
        </div>
        <div className="card-actions"> {/* Container for interaction buttons */}
          {/* Like button */}
          <button
            onClick={() => onLike(verse.id, verse.likedBy)}
            className={`like-button ${hasLiked ? 'liked' : ''}`}
            disabled={!userId} // Disable if no user is logged in
            aria-label={hasLiked ? "Unlike this verse" : "Like this verse"} // Accessibility improvement
          >
            <span className="heart-icon">{hasLiked ? '❤️' : '🤍'}</span>
            <span>{verse.likedBy.length}</span>
          </button>
          {/* Delete button: Only render if the current user is the author */}
          {isAuthor && (
            <button
              onClick={() => onDelete(verse.id, verse.userId)}
              className="delete-button"
              title="Delete this verse" // Tooltip
              aria-label="Delete this verse" // Accessibility improvement
            >
              🗑️ {/* Trash can emoji for delete icon */}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerseCard;
