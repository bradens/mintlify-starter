import { useState } from "react";

interface ShareButtonProps {
  query: string;
}

export function ShareButton({ query }: ShareButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const encodedQuery = encodeURIComponent(query);
      const shareUrl = `https://codex-dashboard-explorer.vercel.app/embed.html?query=${encodedQuery}`;

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL to clipboard:', err);
    }
  };

  return (
    <div className="share-button-container">
      <button
        className="graphiql-toolbar-button"
        onClick={handleShare}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={copied ? "Copied!" : "Share query"}
        aria-label="Share query"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      </button>
      {showTooltip && (
        <div className="share-tooltip">
          {copied ? "Copied!" : "Share query"}
        </div>
      )}
    </div>
  );
}