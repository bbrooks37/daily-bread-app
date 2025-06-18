// src/components/MessageDisplay.tsx
// This component is responsible for displaying application-wide messages
// (e.g., success, error, or informational messages).
import React from 'react';
import '../index.css'; // Import global CSS for styling

// Define props interface for MessageDisplay component
interface MessageDisplayProps {
  message: string; // The message string to be displayed
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  // If no message is provided, render nothing
  if (!message) return null;

  // Determine the CSS class based on the message content for different styling
  // (e.g., success messages start with specific emojis)
  const isSuccess = message.startsWith('✨') || message.startsWith('💖') || message.startsWith('❤️') || message.startsWith('🗑️');
  const messageClass = isSuccess ? 'message-success' : 'message-error';

  return (
    // Apply general message-display class and a specific class for success/error
    <div className={`message-display ${messageClass}`}>
      {message}
    </div>
  );
};

export default MessageDisplay;
