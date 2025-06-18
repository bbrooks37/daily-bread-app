// src/App.tsx
// This is the main application component, orchestrating data flow, state, and child components.
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, type User as FirebaseAuthUser } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, serverTimestamp, type DocumentData, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';

// Import Firebase instances and config from the centralized firebase.ts file
import { auth, db, firebaseConfig } from './firebase';

// Import the modularized React components
import MessageDisplay from './components/MessageDisplay';
import AddVerseModal from './components/AddVerseModal';
import VerseCard from './components/VerseCard';

// Import global CSS for overall application styling
import './index.css';

// Interface for Verse data structure (could be in a shared 'types.ts' file)
interface Verse {
  id: string;
  text: string;
  verseReference: string;
  userId: string;
  timestamp: Date;
  likedBy: string[];
}

const App: React.FC = () => {
  // State variables for Firebase authentication status and user data
  const [userId, setUserId] = useState<string | null>(null);
  // State for storing the list of fetched verses
  const [verses, setVerses] = useState<Verse[]>([]);
  // State for displaying general messages to the user (e.g., success, error)
  const [message, setMessage] = useState<string>('');
  // State to manage the overall loading status of the application
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State variables for the "Add Verse" modal and its form inputs
  const [showAddVerseModal, setShowAddVerseModal] = useState<boolean>(false);
  const [verseText, setVerseText] = useState<string>('');
  const [verseReference, setVerseReference] = useState<string>('');
  // State for validation errors related to verse text and reference
  const [verseTextError, setVerseTextError] = useState<string>('');
  const [verseReferenceError, setVerseReferenceError] = useState<string>('');
  // State to indicate if a verse submission is in progress
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Effect hook for Firebase Authentication initialization and state observation.
  // This runs once when the component mounts.
  useEffect(() => {
    // Subscribe to authentication state changes using the 'auth' instance from firebase.ts
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseAuthUser | null) => {
      if (user) {
        // If a user is signed in, set their UID and a welcome message
        setUserId(user.uid);
        setMessage(`Welcome, User ID: ${user.uid.substring(0, 8)}...`);
      } else {
        // If no user is signed in, attempt anonymous authentication
        console.log("No user signed in. Attempting anonymous sign-in.");
        try {
          await signInAnonymously(auth); // Use the imported 'auth' instance
        } catch (authError: any) {
          // Log and display authentication errors
          console.error("Firebase authentication error:", authError);
          setMessage(`Authentication failed: ${authError.message}`);
        }
      }
      // Set loading to false once authentication attempt is complete
      setIsLoading(false);
    });

    // Cleanup function: unsubscribe from auth state changes when component unmounts
    return () => unsubscribeAuth();
  }, []); // Empty dependency array ensures this effect runs only once

  // Effect hook for fetching verses from Firestore in real-time.
  // This runs whenever 'db' (Firestore instance) or 'userId' changes.
  useEffect(() => {
    // Only proceed if Firestore and user ID are available
    if (!db || !userId) {
      return;
    }

    // Construct the Firestore collection reference using the project ID
    const projectId = firebaseConfig.projectId;
    const versesCollectionRef = collection(db, `artifacts/${projectId}/public/data/dailyVerses`);
    // Create a query for the collection (orderBy commented out to avoid index requirements in Canvas)
    const q = query(versesCollectionRef /*, orderBy('timestamp', 'desc')*/);

    // Subscribe to real-time updates from Firestore
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const fetchedVerses: Verse[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        fetchedVerses.push({
          id: doc.id,
          text: data.text,
          verseReference: data.verseReference,
          userId: data.userId,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(), // Convert Firestore Timestamp to Date object
          likedBy: data.likedBy || [], // Ensure likedBy array exists, default to empty
        });
      });
      // Client-side sorting: newest verses first
      fetchedVerses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setVerses(fetchedVerses); // Update state with fetched verses
    }, (error) => {
      // Log and display errors during data fetching
      console.error("Error fetching verses:", error);
      setMessage(`❌ Error loading verses: ${error.message}`);
    });

    // Cleanup function: unsubscribe from Firestore updates when component unmounts or dependencies change
    return () => unsubscribeFirestore();
  }, [db, userId]); // Dependencies: Firestore instance and user ID

  // Handler for submitting a new verse via the modal form
  const handleAddVerseSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Clear previous error messages
    setVerseTextError('');
    setVerseReferenceError('');
    setMessage('');

    // Ensure Firebase is initialized and user is authenticated
    if (!db || !userId) {
      setMessage("Please wait for authentication to complete before adding a verse.");
      return;
    }

    // Client-side form validation
    let isValid = true;
    if (verseText.trim().length < 10) {
      setVerseTextError('Verse text must be at least 10 characters long.');
      isValid = false;
    }
    if (verseText.trim().length > 500) {
      setVerseTextError('Verse text cannot exceed 500 characters.');
      isValid = false;
    }
    if (!verseReference.trim()) {
      setVerseReferenceError('Verse reference cannot be empty.');
      isValid = false;
    } else if (!/^[A-Za-z\s]+\s\d+:\d+(-\d+)?(\s\(.+\))?$/.test(verseReference.trim())) {
      // Regex for basic "Book Chapter:Verse" or "Book Chapter:Verse-Verse (Version)" format
      setVerseReferenceError('Please use a valid format (e.g., John 3:16 or Romans 8:28-29 (NIV)).');
      isValid = false;
    }

    // If validation fails, display a general error message and stop
    if (!isValid) {
      setMessage('Please correct the errors in the form.');
      return;
    }

    setIsSubmitting(true); // Set submitting state to true
    try {
      const projectId = firebaseConfig.projectId;
      // Add a new document to the 'dailyVerses' collection
      await addDoc(collection(db, `artifacts/${projectId}/public/data/dailyVerses`), {
        text: verseText.trim(), // Trim whitespace from text
        verseReference: verseReference.trim(), // Trim whitespace from reference
        userId: userId,
        timestamp: serverTimestamp(), // Use Firestore's server timestamp for consistency
        likedBy: [], // Initialize likedBy array as empty
      });
      // Display success message and reset form fields
      setMessage("✨ Verse added successfully! Thank you for sharing God's word. 🙏");
      setVerseText('');
      setVerseReference('');
      setShowAddVerseModal(false); // Close the modal
    } catch (error: any) {
      // Log and display error if adding verse fails
      console.error("Error adding document: ", error);
      setMessage(`❌ Error adding verse: ${error.message}. Please try again.`);
    } finally {
      setIsSubmitting(false); // Always reset submitting state
    }
  };

  // Handler for liking/unliking a verse
  const handleLikeVerse = async (verseId: string, currentLikedBy: string[]) => {
    if (!db || !userId) {
      setMessage("Please sign in to like verses.");
      return;
    }

    const projectId = firebaseConfig.projectId;
    // Get a reference to the specific verse document
    const verseRef = doc(db, `artifacts/${projectId}/public/data/dailyVerses`, verseId);

    // Check if the current user has already liked this verse
    const hasLiked = currentLikedBy.includes(userId);

    try {
      if (hasLiked) {
        // If liked, remove user's ID from likedBy array (unlike)
        await updateDoc(verseRef, {
          likedBy: arrayRemove(userId)
        });
        setMessage("💖 Verse unliked.");
      } else {
        // If not liked, add user's ID to likedBy array (like)
        await updateDoc(verseRef, {
          likedBy: arrayUnion(userId)
        });
        setMessage("❤️ Verse liked!");
      }
    } catch (error: any) {
      console.error("Error liking/unliking verse:", error);
      setMessage(`❌ Failed to update like: ${error.message}`);
    }
  };

  // Handler for deleting a verse
  const handleDeleteVerse = async (verseId: string, verseUserId: string) => {
    if (!db || !userId) {
      setMessage("Please sign in to delete verses.");
      return;
    }

    // Client-side check: Ensure the current user is the author of the verse.
    // Firebase security rules will also enforce this.
    if (userId !== verseUserId) {
      setMessage("🚫 You can only delete your own verses.");
      return;
    }

    // Provide a confirmation prompt to the user.
    // In a production app, a custom modal would be used instead of window.confirm.
    if (!window.confirm("Are you sure you want to delete this verse? This action cannot be undone.")) {
      return;
    }

    try {
      const projectId = firebaseConfig.projectId;
      // Get a reference to the specific verse document
      const verseRef = doc(db, `artifacts/${projectId}/public/data/dailyVerses`, verseId);
      // Delete the document from Firestore
      await deleteDoc(verseRef);
      setMessage("🗑️ Verse deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting verse:", error);
      setMessage(`❌ Failed to delete verse: ${error.message}.`);
    }
  };

  // Display a loading screen while the application initializes
  if (isLoading) {
    return (
      <div className="loading-screen">
        <p className="loading-text">Loading Application...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Main application title */}
      <h1 className="app-title">
        <span className="title-part-1">Daily Bread</span>
        <span className="title-part-2">Spread Love Through God's Word</span>
      </h1>

      {/* Message display area */}
      <MessageDisplay message={message} />

      {/* Display user ID if available */}
      {userId && (
        <div className="user-id-display">
          Your User ID: <span className="user-id-value">{userId}</span>
        </div>
      )}

      {/* Button to open the "Add Verse" modal */}
      <button
        onClick={() => setShowAddVerseModal(true)}
        className="share-verse-button"
      >
        Share Your Daily Verse!
      </button>

      {/* The AddVerseModal component */}
      <AddVerseModal
        showModal={showAddVerseModal}
        onClose={() => {
          setShowAddVerseModal(false);
          setVerseTextError(''); // Clear errors when closing modal
          setVerseReferenceError('');
          setMessage(''); // Clear general message
          setVerseText(''); // Clear form fields
          setVerseReference('');
        }}
        verseText={verseText}
        setVerseText={setVerseText}
        verseReference={verseReference}
        setVerseReference={setVerseReference}
        verseTextError={verseTextError}
        verseReferenceError={verseReferenceError}
        isSubmitting={isSubmitting}
        onSubmit={handleAddVerseSubmit}
      />

      {/* Grid to display all verses */}
      <div className="verse-grid">
        {verses.length === 0 ? (
          // Message if no verses are available
          <p className="no-verses-message">No verses yet. Be the first to share!</p>
        ) : (
          // Map through the verses array and render a VerseCard for each
          verses.map((verse) => (
            <VerseCard
              key={verse.id}
              verse={verse}
              userId={userId}
              onLike={handleLikeVerse}
              onDelete={handleDeleteVerse} // Pass the delete handler to VerseCard
            />
          ))
        )}
      </div>
    </div>
  );
};

export default App;
