'use client';

import { useEffect, useState } from "react";
import { Section } from "../shared/Section";
import { PageTitle } from "../shared/PageTitle";
import { t } from "@/lib/i18n";

export function VideoTestimonialSection() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  useEffect(() => {
    // This code runs only on the client-side after the component mounts
    const videos = t.pages.home.videoTestimonials;
    if (videos.length > 0) {
      const randomIndex = Math.floor(Math.random() * videos.length);
      setSelectedVideoId(videos[randomIndex].videoId);
    }
  }, []);

  return (
    <Section id="video-testimonial" className="bg-primary text-primary-foreground">
      <PageTitle 
        title={t.pages.home.videoTestimonialTitle} 
        subtitle={t.pages.home.videoTestimonialSubtitle}
        titleClassName="text-primary-foreground"
        subtitleClassName="text-primary-foreground/80"
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="aspect-w-16 aspect-h-9 rounded-xl overflow-hidden shadow-2xl ring-4 ring-accent/50">
          {selectedVideoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${selectedVideoId}?rel=0&showinfo=0&autoplay=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          ) : (
            // Placeholder for SSR and while the client-side script runs
            <div className="w-full h-full bg-primary/50 flex items-center justify-center">
              <p>Loading video...</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
