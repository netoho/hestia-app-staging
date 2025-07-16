'use client';

import { useState, useEffect } from 'react';

/**
 * VideoPlayer Component
 * 
 * A reusable YouTube video player component that supports:
 * - Fixed video IDs or random selection from multiple IDs
 * - Responsive design with aspect ratios
 * - Fixed dimensions
 * - Custom styling and embed parameters
 * 
 * @example
 * // Basic usage with fixed video
 * <VideoPlayer videoId="dQw4w9WgXcQ" />
 * 
 * @example
 * // Random selection from multiple videos
 * <VideoPlayer videoIds={["video1", "video2", "video3"]} />
 * 
 * @example
 * // Responsive with aspect ratio
 * <VideoPlayer 
 *   videoId="dQw4w9WgXcQ" 
 *   useAspectRatio={true} 
 *   aspectRatio="16/9" 
 *   className="rounded-lg"
 * />
 */

interface VideoPlayerProps {
  /** YouTube video ID */
  videoId?: string;
  /** Array of video IDs to randomly select from (overrides videoId) */
  videoIds?: string[];
  /** Video title for accessibility */
  title?: string;
  /** Custom width (defaults to responsive) */
  width?: number;
  /** Custom height (defaults to responsive) */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use aspect ratio container (recommended for responsive design) */
  useAspectRatio?: boolean;
  /** Aspect ratio (e.g., "16/9", "4/3") when useAspectRatio is true */
  aspectRatio?: string;
  /** Loading placeholder text */
  loadingText?: string;
  /** YouTube embed parameters */
  embedParams?: {
    rel?: 0 | 1;
    showinfo?: 0 | 1;
    autoplay?: 0 | 1;
    modestbranding?: 0 | 1;
    controls?: 0 | 1;
  };
}

export function VideoPlayer({
  videoId,
  videoIds,
  title = "YouTube video player",
  width,
  height,
  className = "",
  useAspectRatio = false,
  aspectRatio = "16/9",
  loadingText = "Loading video...",
  embedParams = {
    rel: 0,
    showinfo: 0,
    autoplay: 0,
  }
}: VideoPlayerProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    videoId || null
  );

  useEffect(() => {
    // If videoIds array is provided, randomly select one
    if (videoIds && videoIds.length > 0) {
      const randomIndex = Math.floor(Math.random() * videoIds.length);
      setSelectedVideoId(videoIds[randomIndex]);
    } else if (videoId) {
      setSelectedVideoId(videoId);
    }
  }, [videoId, videoIds]);

  // Build YouTube embed URL with parameters
  const buildEmbedUrl = (id: string) => {
    const params = new URLSearchParams();
    Object.entries(embedParams).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  };

  // Loading placeholder
  const LoadingPlaceholder = () => (
    <div className="w-full h-full bg-muted/50 flex items-center justify-center">
      <p className="text-muted-foreground">{loadingText}</p>
    </div>
  );

  // Video iframe
  const VideoIframe = ({ id }: { id: string }) => (
    <iframe
      src={buildEmbedUrl(id)}
      title={title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="w-full h-full"
      width={width}
      height={height}
    />
  );

  // Render with aspect ratio container
  if (useAspectRatio) {
    return (
      <div className={`overflow-hidden ${className}`} style={{ aspectRatio }}>
        {selectedVideoId ? (
          <VideoIframe id={selectedVideoId} />
        ) : (
          <LoadingPlaceholder />
        )}
      </div>
    );
  }

  // Render with fixed dimensions or responsive
  const containerClasses = `${className} ${
    width && height ? '' : 'w-full'
  }`;

  const containerStyle = width && height ? { width, height } : {};

  return (
    <div className={containerClasses} style={containerStyle}>
      {selectedVideoId ? (
        <VideoIframe id={selectedVideoId} />
      ) : (
        <LoadingPlaceholder />
      )}
    </div>
  );
}

export default VideoPlayer;