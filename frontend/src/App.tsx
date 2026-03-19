/**
 * App — the only file allowed to import from both src/core/ and src/integrations/.
 * Wires the review-backend integration into the generic core ChatInterface.
 */
import { ChatInterface } from './core';
import {
  ReviewStreamEventTransformer,
  reviewChatUIConfig,
  renderReviewReport,
} from './integrations/review-backend';
import './App.css';

// Instantiated outside the component — stable reference, never re-created on render.
const transformer = new ReviewStreamEventTransformer();

/**
 * Root application component.
 * Composes core ChatInterface with review-backend integration artifacts.
 */
function App() {
  return (
    <ChatInterface
      config={reviewChatUIConfig}
      transformer={transformer}
      renderReport={renderReviewReport}
    />
  );
}

export default App;
