import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export interface Testimonial {
  id: number;
  quote: string;
  author: string;
  photoSrc: string;
  photoAlt: string;
}

export interface SectionThreeTestimonialsProps {
  onLearnMore?: () => void;
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    id: 1,
    quote:
      "I never thought hearing how my Nanu bought his first car would be so interesting and emotional.. It made me realise how many stories I never asked, but always needed.",
    author: "— Yajur, 24",
    photoSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/arnav_family.jpg",
    photoAlt: "Aarav & Family",
  },
  {
    id: 2,
    quote:
      "Papa keeps giving me life lessons I forget the next week. Now, listening to them in his own voice whenever I want to… it just hits differently. It feels like future-me will thank Kahani for this.",
    author: "— Angel, 18",
    photoSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/riya_s.jpg",
    photoAlt: "Angel",
  },
  {
    id: 3,
    quote:
      "My son is too young to understand who his Nani really is. But someday, when he listens to her stories in her voice, he will know the warmth he comes from.",
    author: "— Rashmi, 45",
    photoSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/rashmi.jpg",
    photoAlt: "Rashmi",
  },
  {
    id: 4,
    quote:
      "पापा के पास फौज की ढेरों कहानियाँ हैं। खुशी है कि अब मैं उन्हें रिकॉर्ड कर सकता हूँ - वे हमेशा हमारी रगों में दौड़ती रहेंगी।",
    author: "— Vikram Singh, 38",
    photoSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/vikaram_singh.heic",
    photoAlt: "Pita Rajiv S.",
  },
  {
    id: 5,
    quote:
      "We discovered things about our father we never knew. This does not just preserve memories - it starts conversations.",
    author: "— Radhika, 32",
    photoSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/sonal_amit_p.jpg",
    photoAlt: "Sonal & Amit P",
  },
];

export default function SectionThreeTestimonials({
  onLearnMore,
  testimonials = defaultTestimonials,
}: SectionThreeTestimonialsProps) {
  // infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollStartRef = useRef<number>(0);
  const lastScrollLeftRef = useRef<number>(0);

  // Create infinite loop by duplicating testimonials (3 sets for seamless loop)
  const duplicatedTestimonials = [
    ...testimonials,
    ...testimonials,
    ...testimonials,
  ];

  useEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let scrollTimeout: NodeJS.Timeout | undefined;
    let resetTimeout: NodeJS.Timeout | undefined;
    let lastScrollTime = 0;
    let isUserInteracting = false;

    const calcOneSetWidth = () => {
      const firstCard = content.querySelector(
        '[data-testid^="testimonial-"]',
      ) as HTMLElement;
      const firstSpacer = content.querySelector(
        ".flex-shrink-0:first-child",
      ) as HTMLElement;
      if (!firstCard) return 0;
      const cardWidth = firstCard.offsetWidth;
      const gap = 24;
      const spacerWidth = firstSpacer ? firstSpacer.offsetWidth : 0;
      return spacerWidth * 2 + (cardWidth + gap) * testimonials.length - gap;
    };

    const getCardWidth = () => {
      const firstCard = content.querySelector(
        '[data-testid^="testimonial-"]',
      ) as HTMLElement;
      return firstCard ? firstCard.offsetWidth + 24 : 0;
    };

    const handleTouchStart = () => {
      isUserInteracting = true;
      scrollStartRef.current = container.scrollLeft;
      clearTimeout(resetTimeout);
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        isUserInteracting = false;
      }, 500);
    };

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      lastScrollTime = Date.now();
      isUserInteracting = true;

      if (!isScrolling) {
        const currentScroll = container.scrollLeft;
        const scrollDelta = Math.abs(currentScroll - scrollStartRef.current);
        const cardWidth = getCardWidth();
        const maxScrollDistance = cardWidth * 2;

        if (scrollDelta > maxScrollDistance) {
          const direction = currentScroll > lastScrollLeftRef.current ? 1 : -1;
          const targetScroll =
            scrollStartRef.current + direction * maxScrollDistance;
          setIsScrolling(true);
          container.style.scrollBehavior = "auto";
          container.scrollLeft = targetScroll;
          requestAnimationFrame(() => {
            container.style.scrollBehavior = "smooth";
            setIsScrolling(false);
          });
        }
      }

      lastScrollLeftRef.current = container.scrollLeft;

      scrollTimeout = setTimeout(() => {
        scrollStartRef.current = container.scrollLeft;
        if (isScrolling || isUserInteracting) return;

        const scrollLeft = container.scrollLeft;
        const oneSetWidth = calcOneSetWidth();
        if (oneSetWidth === 0) return;

        const timeSinceLastScroll = Date.now() - lastScrollTime;
        if (timeSinceLastScroll < 2000) return;

        if (scrollLeft >= oneSetWidth * 2 - 100) {
          setIsScrolling(true);
          container.style.scrollBehavior = "auto";
          container.scrollLeft = oneSetWidth + (scrollLeft - oneSetWidth * 2);
          requestAnimationFrame(() => {
            container.style.scrollBehavior = "smooth";
            setIsScrolling(false);
          });
        } else if (scrollLeft <= 100) {
          setIsScrolling(true);
          container.style.scrollBehavior = "auto";
          container.scrollLeft = oneSetWidth + scrollLeft;
          requestAnimationFrame(() => {
            container.style.scrollBehavior = "smooth";
            setIsScrolling(false);
          });
        }
      }, 300);
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("scroll", handleScroll, { passive: true });

    const initScroll = () => {
      const oneSetWidth = calcOneSetWidth();
      if (oneSetWidth > 0) {
        container.style.scrollBehavior = "auto";
        container.scrollLeft = oneSetWidth;
        setTimeout(() => {
          container.style.scrollBehavior = "smooth";
        }, 0);
      }
    };

    const initTimeout = setTimeout(initScroll, 100);
    window.addEventListener("resize", initScroll);

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(resetTimeout);
      clearTimeout(initTimeout);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", initScroll);
    };
  }, [testimonials, isScrolling]);

  return (
    <section
      id="why-kahani"
      className="w-full bg-white px-4 sm:px-6 py-8 sm:py-12"
    >
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
          Why Kahani?
        </h2>

        {/* Testimonials Slider */}
        <div className="relative -mx-4 sm:-mx-6 md:-mx-8">
          {/* Left gradient fade - only for medium and large devices */}
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white via-white to-transparent z-10 pointer-events-none" />

          {/* Right gradient fade - only for medium and large devices */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white via-white to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide px-4 sm:px-6 pb-8"
            role="region"
            aria-label="Testimonials carousel"
            aria-roledescription="carousel"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollBehavior: "smooth",
              scrollPaddingLeft: "0px",
              scrollPaddingRight: "0px",
            }}
          >
            <div
              ref={contentRef}
              className="flex gap-6 pb-4"
              style={{ width: "max-content" }}
            >
              {/* Spacer for centering first card on mobile */}
              <div className="flex-shrink-0 w-[calc((100vw-85vw-2rem)/2)] sm:w-0" />

              {duplicatedTestimonials.map((testimonial, index) => (
                <div
                  key={`${testimonial.id}-${index}`}
                  className="flex-shrink-0 w-[85vw] max-w-[500px] bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-3 sm:space-y-4"
                  style={{
                    scrollSnapAlign: "center",
                    scrollSnapStop: "always",
                  }}
                  aria-roledescription="slide"
                  aria-label={`Testimonial ${(index % testimonials.length) + 1} of ${testimonials.length}`}
                  data-testid={`testimonial-${testimonial.id}-${index}`}
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <img
                      src={testimonial.photoSrc}
                      alt={testimonial.photoAlt}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover"
                    />
                  </div>

                  {/* Quote */}
                  <p className="text-[#1B2632] leading-relaxed text-sm sm:text-base">
                    "{testimonial.quote}"
                  </p>

                  {/* Attribution */}
                  <p className="text-[#1B2632]/60 italic text-xs sm:text-sm">
                    {testimonial.author}
                  </p>
                </div>
              ))}

              {/* Spacer for centering last card on mobile */}
              <div className="flex-shrink-0 w-[calc((100vw-85vw-2rem)/2)] sm:w-0" />
            </div>
          </div>
        </div>

        {/* Scroll Indicator Dots */}
        <div className="flex justify-center gap-3 pt-4">
          {testimonials.map((_, index) => (
            <div
              key={index}
              className="w-2.5 h-2.5 rounded-full bg-[#A35139]/40 hover:bg-[#A35139] transition-colors duration-300"
            />
          ))}
        </div>
      </div>

      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}[role="region"][aria-roledescription="carousel"]{overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}[role="region"][aria-roledescription="carousel"]>div>div[style*="scrollSnapAlign"]{scroll-snap-stop:always!important}`}</style>
    </section>
  );
}
