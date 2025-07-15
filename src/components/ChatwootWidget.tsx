'use client';

import { useEffect } from 'react';

const ChatwootWidget = () => {
  useEffect(() => {
    // Only run if the required environment variables are set
    const websiteToken = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;

    if (!websiteToken || !baseUrl) {
      return;
    }

    // Add Chatwoot Settings to the window
    (window as any).chatwootSettings = {
      hideMessageBubble: false,
      position: 'right', // 'left' or 'right'
      locale: 'es', // Language: 'en', 'es', etc.
      type: 'standard', // 'standard' or 'expanded_bubble'
    };

    // Script injection logic
    (function (d, t) {
      const g = d.createElement(t) as HTMLScriptElement;
      const s = d.getElementsByTagName(t)[0];
      g.src = `${baseUrl}/packs/js/sdk.js`;
      g.async = true;
      s.parentNode!.insertBefore(g, s);
      g.onload = function () {
        (window as any).chatwootSDK.run({
          websiteToken: websiteToken,
          baseUrl: baseUrl,
        });
      };
    })(document, 'script');

  }, []); // Empty dependency array ensures this runs only once on mount

  return null; // This component doesn't render anything
};

export default ChatwootWidget;
