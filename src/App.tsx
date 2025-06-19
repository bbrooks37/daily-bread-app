// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously, type User as FirebaseAuthUser } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, serverTimestamp, type DocumentData, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';

import { auth, db, firebaseConfig } from './firebase';
import MessageDisplay from './components/MessageDisplay';
import AddVerseModal from './components/AddVerseModal';
import VerseCard from './components/VerseCard';
import './index.css';

// API.Bible configuration - NOW POINTING TO YOUR PROXY SERVER
const PROXY_BASE_URL = 'http://localhost:3001/api'; // Your proxy server URL

// Interface for Verse data structure
interface Verse {
  id: string;
  text: string;
  verseReference: string;
  userId: string;
  timestamp: Date;
  likedBy: string[];
}

// Interfaces for API.Bible data (simplified for this context, but maintain accurate structure)
interface Bible {
  id: string;
  name: string;
  nameLocal?: string; // Optional as not always needed
  abbreviation?: string;
}

interface Book {
  id: string;
  name: string;
  nameLong?: string;
  abbreviation?: string;
}

interface Chapter {
  id: string;
  number: string;
  reference?: string;
}

interface VerseContentResponse {
  data: {
    content: string;
    reference: string;
  };
}


const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [showAddVerseModal, setShowAddVerseModal] = useState<boolean>(false);
  const [verseText, setVerseText] = useState<string>('');
  const [selectedBibleId, setSelectedBibleId] = useState<string>('');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [verseReferenceForFirestore, setVerseReferenceForFirestore] = useState<string>(''); // This holds the formatted reference to save

  const [verseTextError, setVerseTextError] = useState<string>('');
  const [verseReferenceError, setVerseReferenceError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [bibles, setBibles] = useState<Bible[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingBibles, setIsLoadingBibles] = useState<boolean>(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState<boolean>(false);
  const [isLoadingVerseContent, setIsLoadingVerseContent] = useState<boolean>(false);


  // Firebase Authentication
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseAuthUser | null) => {
      if (user) {
        setUserId(user.uid);
        setMessage(`Welcome, User ID: ${user.uid.substring(0, 8)}...`);
      } else {
        console.log("No user signed in. Attempting anonymous sign-in.");
        try {
          await signInAnonymously(auth);
        } catch (authError: any) {
          console.error("Firebase authentication error:", authError);
          setMessage(`Authentication failed: ${authError.message}`);
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Fetch verses from Firestore
  useEffect(() => {
    if (!db || !userId) {
      return;
    }
    const projectId = firebaseConfig.projectId;
    const versesCollectionRef = collection(db, `artifacts/${projectId}/public/data/dailyVerses`);
    const q = query(versesCollectionRef /*, orderBy('timestamp', 'desc')*/);
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const fetchedVerses: Verse[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        fetchedVerses.push({
          id: doc.id,
          text: data.text,
          verseReference: data.verseReference,
          userId: data.userId,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          likedBy: data.likedBy || [],
        });
      });
      fetchedVerses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setVerses(fetchedVerses);
    }, (error) => {
      console.error("Error fetching verses:", error);
      setMessage(`❌ Error loading verses: ${error.message}`);
    });
    return () => unsubscribeFirestore();
  }, [db, userId]);


  // =========================================================
  // API.Bible Fetching Logic (NOW VIA PROXY)
  // =========================================================

  // Fetch Bibles via proxy
  useEffect(() => {
    const fetchBibles = async () => {
      setIsLoadingBibles(true);
      try {
        const response = await fetch(`${PROXY_BASE_URL}/bibles`); // Call your proxy
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const englishBibles = data.data.filter((b: any) => b.language.id === 'eng');
        setBibles(englishBibles);
        if (englishBibles.length > 0) {
          setSelectedBibleId(englishBibles[0].id);
        }
      } catch (error: any) {
        console.error("Error fetching bibles:", error);
        setMessage(`❌ Failed to load Bibles: ${error.message}`);
      } finally {
        setIsLoadingBibles(false);
      }
    };
    fetchBibles();
  }, []);

  // Fetch Books when Bible changes via proxy
  useEffect(() => {
    if (!selectedBibleId) {
      setBooks([]);
      setSelectedBookId('');
      setChapters([]);
      setSelectedChapterId('');
      setVerseText('');
      return;
    }
    const fetchBooks = async () => {
      setIsLoadingBooks(true);
      setBooks([]);
      setSelectedBookId('');
      setChapters([]);
      setSelectedChapterId('');
      setVerseText('');
      try {
        const response = await fetch(`${PROXY_BASE_URL}/bibles/${selectedBibleId}/books`); // Call your proxy
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBooks(data.data);
      } catch (error: any) {
        console.error("Error fetching books:", error);
        setMessage(`❌ Failed to load books for selected Bible: ${error.message}`);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    fetchBooks();
  }, [selectedBibleId]);

  // Fetch Chapters when Book changes via proxy
  useEffect(() => {
    if (!selectedBookId) {
      setChapters([]);
      setSelectedChapterId('');
      setVerseText('');
      return;
    }
    const fetchChapters = async () => {
      setIsLoadingChapters(true);
      setChapters([]);
      setSelectedChapterId('');
      setVerseText('');
      try {
        const response = await fetch(`${PROXY_BASE_URL}/bibles/${selectedBibleId}/books/${selectedBookId}/chapters`); // Call your proxy
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setChapters(data.data);
        if (data.data.length === 1) {
          setSelectedChapterId(data.data[0].id);
        }
      } catch (error: any) {
        console.error("Error fetching chapters:", error);
        setMessage(`❌ Failed to load chapters for selected Book: ${error.message}`);
      } finally {
        setIsLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [selectedBibleId, selectedBookId]);

  // Fetch Verse Content when Chapter changes via proxy
  const fetchVerseContent = useCallback(async () => {
    if (!selectedChapterId || !selectedBibleId || !selectedBookId) {
      setVerseText('');
      setVerseReferenceForFirestore('');
      return;
    }
    setIsLoadingVerseContent(true);
    setVerseText('');
    setVerseReferenceError('');
    setVerseTextError('');
    setMessage('');
    try {
      const params = new URLSearchParams({
        'content-type': 'text',
        'include-notes': 'false',
        'include-titles': 'false',
        'include-chapter-numbers': 'false',
        'include-verse-numbers': 'true',
      }).toString();

      const response = await fetch(`${PROXY_BASE_URL}/bibles/${selectedBibleId}/chapters/${selectedChapterId}?${params}`); // Call your proxy
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: VerseContentResponse = await response.json();
      const content = result.data.content;
      setVerseText(content);

      const currentBook = books.find(book => book.id === selectedBookId);
      const currentChapter = chapters.find(chapter => chapter.id === selectedChapterId);

      if (currentBook && currentChapter) {
        setVerseReferenceForFirestore(`${currentBook.name} ${currentChapter.number}`);
      } else {
        setVerseReferenceForFirestore(result.data.reference || `API Reference: ${selectedChapterId}`);
      }
    } catch (error: any) {
      console.error("Error fetching verse content:", error);
      setMessage(`❌ Failed to load verse content: ${error.message}`);
      setVerseText('Failed to load verse. Please try again or select a different verse.');
      setVerseReferenceForFirestore('');
    } finally {
      setIsLoadingVerseContent(false);
    }
  }, [selectedBibleId, selectedBookId, selectedChapterId, books, chapters]);

  useEffect(() => {
    fetchVerseContent();
  }, [selectedChapterId, fetchVerseContent]);


  // =========================================================
  // Existing Handlers (Unchanged)
  // =========================================================

  const handleAddVerseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setVerseTextError('');
    setVerseReferenceError('');
    setMessage('');

    if (!db || !userId) {
      setMessage("Please wait for authentication to complete before adding a verse.");
      return;
    }

    let isValid = true;
    if (!selectedBibleId || !selectedBookId || !selectedChapterId) {
      setVerseReferenceError('Please select a Bible, Book, and Chapter.');
      isValid = false;
    }
    if (verseText.trim().length < 10) {
      setVerseTextError('Verse text must be at least 10 characters long.');
      isValid = false;
    }
    if (verseText.trim().length > 1000) {
      setVerseTextError('Verse text cannot exceed 1000 characters.');
      isValid = false;
    }

    if (!isValid) {
      setMessage('Please correct the errors in the form.');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectId = firebaseConfig.projectId;
      await addDoc(collection(db, `artifacts/${projectId}/public/data/dailyVerses`), {
        text: verseText.trim(),
        verseReference: verseReferenceForFirestore,
        userId: userId,
        timestamp: serverTimestamp(),
        likedBy: [],
      });
      setMessage("✨ Verse added successfully! Thank you for sharing God's word. 🙏");
      setVerseText('');
      setVerseReferenceForFirestore('');
      setSelectedBookId('');
      setSelectedChapterId('');
      setShowAddVerseModal(false);
    } catch (error: any) {
      console.error("Error adding document: ", error);
      setMessage(`❌ Error adding verse: ${error.message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeVerse = async (verseId: string, currentLikedBy: string[]) => {
    if (!db || !userId) {
      setMessage("Please sign in to like verses.");
      return;
    }
    const projectId = firebaseConfig.projectId;
    const verseRef = doc(db, `artifacts/${projectId}/public/data/dailyVerses`, verseId);
    const hasLiked = currentLikedBy.includes(userId);
    try {
      if (hasLiked) {
        await updateDoc(verseRef, { likedBy: arrayRemove(userId) });
        setMessage("💖 Verse unliked.");
      } else {
        await updateDoc(verseRef, { likedBy: arrayUnion(userId) });
        setMessage("❤️ Verse liked!");
      }
    } catch (error: any) {
      console.error("Error liking/unliking verse:", error);
      setMessage(`❌ Failed to update like: ${error.message}`);
    }
  };

  const handleDeleteVerse = async (verseId: string, verseUserId: string) => {
    if (!db || !userId) {
      setMessage("Please sign in to delete verses.");
      return;
    }
    if (userId !== verseUserId) {
      setMessage("🚫 You can only delete your own verses.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this verse? This action cannot be undone.")) {
      return;
    }
    try {
      const projectId = firebaseConfig.projectId;
      const verseRef = doc(db, `artifacts/${projectId}/public/data/dailyVerses`, verseId);
      await deleteDoc(verseRef);
      setMessage("🗑️ Verse deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting verse:", error);
      setMessage(`❌ Failed to delete verse: ${error.message}.`);
    }
  };


  if (isLoading) {
    return (
      <div className="loading-screen">
        <p className="loading-text">Loading Application...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="app-title">
        <span className="title-part-1">Daily Bread</span>
        <span className="block mt-2">Spread Love Through God's Word</span>
      </h1>

      <MessageDisplay message={message} />

      {userId && (
        <div className="user-id-display">
          Your User ID: <span className="user-id-value">{userId}</span>
        </div>
      )}

      <button
        onClick={() => {
          setShowAddVerseModal(true);
          setVerseText('');
          setVerseReferenceForFirestore('');
          setSelectedBookId('');
          setSelectedChapterId('');
          setVerseTextError('');
          setVerseReferenceError('');
          setMessage('');
        }}
        className="share-verse-button"
      >
        Share Your Daily Verse!
      </button>

      <AddVerseModal
        showModal={showAddVerseModal}
        onClose={() => {
          setShowAddVerseModal(false);
          setVerseText('');
          setVerseReferenceForFirestore('');
          setSelectedBookId('');
          setSelectedChapterId('');
          setVerseTextError('');
          setVerseReferenceError('');
          setMessage('');
        }}
        verseText={verseText}
        setVerseText={setVerseText}
        verseTextError={verseTextError}
        verseReferenceError={verseReferenceError}
        // Removed the problematic 'verseReference' prop from here, as AddVerseModal no longer expects it.
        bibles={bibles}
        selectedBibleId={selectedBibleId}
        onBibleChange={setSelectedBibleId}
        books={books}
        selectedBookId={selectedBookId}
        onBookChange={setSelectedBookId}
        chapters={chapters}
        selectedChapterId={selectedChapterId}
        onChapterChange={setSelectedChapterId}
        isLoadingBibles={isLoadingBibles}
        isLoadingBooks={isLoadingBooks}
        isLoadingChapters={isLoadingChapters}
        isLoadingVerseContent={isLoadingVerseContent}
        isSubmitting={isSubmitting}
        onSubmit={handleAddVerseSubmit}
      />

      <div className="verse-grid">
        {verses.length === 0 ? (
          <p className="no-verses-message">No verses yet. Be the first to share!</p>
        ) : (
          verses.map((verse) => (
            <VerseCard
              key={verse.id}
              verse={verse}
              userId={userId}
              onLike={handleLikeVerse}
              onDelete={handleDeleteVerse}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default App;
