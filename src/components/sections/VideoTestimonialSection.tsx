'use client';

import { Section } from "../shared/Section";
import { PageTitle } from "../shared/PageTitle";
import { VideoPlayer } from "../ui/VideoPlayer";
import { t } from "@/lib/i18n";

export function VideoTestimonialSection() {
  // Extract video IDs from testimonials data
  const videoIds = t.pages.home.videoTestimonials.map(video => video.videoId);

  return (
    <Section id="video-testimonial" className="bg-primary text-primary-foreground">
      <PageTitle 
        title={t.pages.home.videoTestimonialTitle} 
        subtitle={t.pages.home.videoTestimonialSubtitle}
        titleClassName="text-primary-foreground"
        subtitleClassName="text-primary-foreground/80"
        className="text-center"
      />
      
      <div className="max-w-4xl mx-auto">
        <VideoPlayer
          videoIds={videoIds}
          title="Customer Video Testimonial"
          useAspectRatio={true}
          aspectRatio="4/3"
          className="rounded-xl overflow-hidden shadow-2xl"
          loadingText="Loading testimonial..."
        />
      </div>
    </Section>
  );
}
