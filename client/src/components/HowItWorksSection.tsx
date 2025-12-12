interface Step {
  number: string;
  title: string;
  description: string;
  imageSrc: string;
}

interface HowItWorksSectionProps {
  steps?: Step[];
}

const defaultSteps: Step[] = [
  {
    number: "1",
    title: "Choose an Album",
    description:
      "Pick the kind of stories you want to preserve - childhood, love, wisdom, family moments.",
    imageSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/how_it_works_1.jpg",
  },
  {
    number: "2",
    title: "They Share Their Stories on WhatsApp",
    description:
      "Your loved one receives prompts and replies in their own voice, at their own pace.",
    imageSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/how_it_works_2.jpg",
  },
  {
    number: "3",
    title: "Their Kahani Becomes Forever",
    description:
      "You get a beautiful audio album that can be accessed anytime, anywhere - even after 100 years.",
    imageSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/how_it_works_3.jpg",
  },
  // {
  //   number: "4",
  //   title: "Relish with your loved ones",
  //   description:
  //     "Play back your Kahani and experience laughter, nostalgia, and warmth with family and friends.",
  //   imageSrc:
  //     "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80",
  // },
];

export default function HowItWorksSection({
  steps = defaultSteps,
}: HowItWorksSectionProps) {
  return (
    <section
      id="how-it-works"
      className="w-full bg-white px-4 sm:px-6 py-8 sm:py-12"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center mb-8 sm:mb-10 font-['Outfit']">
          How It Works
        </h2>

        {/* Cards Grid - Evenly Spaced */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 pb-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="w-full space-y-4"
              data-testid={`step-${index + 1}`}
            >
              {/* Video/Image Card */}
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-[#1B2632] shadow-xl">
                <img
                  src={step.imageSrc}
                  alt={step.title}
                  className="w-full h-full object-cover opacity-90"
                />

                {/* Step Number Overlay */}
                <div className="absolute top-6 left-6 w-12 h-12 bg-[#A35139] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* Step Content */}
              <div className="px-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1B2632] mb-2 font-['Outfit']">
                  {step.title}
                </h3>
                <p className="text-[#1B2632]/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
