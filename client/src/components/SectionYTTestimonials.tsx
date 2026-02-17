// NOTE: Original text testimonial slider was here.
// It has been replaced by a YouTube Shorts carousel implementation.

import YouTubeTestimonials from "@/components/YouTubeTestimonials";

export interface SectionThreeTestimonialsProps {
  onLearnMore?: () => void;
}

export default function SectionThreeTestimonials(
  _props: SectionThreeTestimonialsProps,
) {
  return <YouTubeTestimonials />;
}
