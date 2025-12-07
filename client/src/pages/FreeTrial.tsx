import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertFreeTrialSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import SimpleHeader from "@/components/SimpleHeader";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, Heart } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";

type FreeTrialFormData = z.infer<typeof insertFreeTrialSchema>;

export default function FreeTrial() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const albumIdFromUrl = urlParams.get("albumId") || "";
  const albumTitleFromUrl = urlParams.get("album") || ""; // Backward compatibility

  // Fetch albums to get title and image from ID
  const { data: albums } = useQuery<
    Array<{ id: string; title: string; cover_image: string }>
  >({
    queryKey: ["/api/albums"],
  });

  // Determine selected album details
  const selectedAlbum = useMemo(() => {
    if (albumIdFromUrl && albums) {
      const album = albums.find((a) => a.id === albumIdFromUrl);
      if (album) return { title: album.title, cover_image: album.cover_image };
    }
    // Fallback to title from URL (backward compatibility) or default
    return {
      title: albumTitleFromUrl || "Our Family History",
      cover_image:
        "https://images.unsplash.com/photo-1542038784456-1ea8c935640e?q=80&w=2670&auto=format&fit=crop", // Default image
    };
  }, [albumIdFromUrl, albumTitleFromUrl, albums]);

  const form = useForm<FreeTrialFormData>({
    resolver: zodResolver(insertFreeTrialSchema),
    defaultValues: {
      customerPhone: "",
      buyerName: "",
      storytellerName: "",
      selectedAlbum: selectedAlbum.title,
    },
  });

  // Update form when album title is determined
  useEffect(() => {
    if (selectedAlbum.title) {
      form.setValue("selectedAlbum", selectedAlbum.title);
    }
  }, [selectedAlbum.title, form]);

  const freeTrialMutation = useMutation({
    mutationFn: async (data: FreeTrialFormData) => {
      const response = await apiRequest("POST", "/api/free-trial", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sign up");
      }
      return response.json();
    },
    onSuccess: (trial) => {
      queryClient.invalidateQueries({ queryKey: ["/api/free-trial"] });

      form.reset();
      setLocation("/thank-you");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FreeTrialFormData) => {
    freeTrialMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
        {/* Page Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B2632] font-['Outfit']">
            Enter your details
          </h1>
        </div>

        {/* Selected Album Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-8 flex items-center gap-4">
          <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={selectedAlbum.cover_image}
              alt={selectedAlbum.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-grow">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold mb-1">
              Selected Album
            </p>
            <h3 className="text-xl font-bold text-[#1B2632]">
              {selectedAlbum.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-[#A35139]/10 px-4 py-2 rounded-full flex-shrink-0">
            <span className="text-sm font-medium text-[#A35139]">
              Quantity:
            </span>
            <span className="text-lg font-bold text-[#A35139]">1</span>
          </div>
        </div>

        {/* Info Accordions */}
        <div className="space-y-4 mb-8">
          <Accordion type="single" collapsible className="w-full">
            {/* What's Included */}
            <AccordionItem
              value="included"
              className="border rounded-xl px-6 bg-white shadow-sm"
            >
              <AccordionTrigger className="text-lg font-semibold text-[#1B2632] hover:no-underline hover:text-[#A35139]">
                What's Included in this
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "5 thoughtful questions",
                    "Whatsapp communication and support",
                    "Voice enabled storytelling",
                    "Finished voice first memory album",
                    "Flexible schedule",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 bg-[#A35139]/10 rounded-full p-1">
                        <Check className="h-3 w-3 text-[#A35139]" />
                      </div>
                      <span className="text-[#1B2632]/80">{item}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* How It Works */}
            <AccordionItem
              value="how-it-works"
              className="border rounded-xl px-6 bg-white shadow-sm mt-4"
            >
              <AccordionTrigger className="text-lg font-semibold text-[#1B2632] hover:no-underline hover:text-[#A35139]">
                How It Works
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#A35139]/10 flex items-center justify-center font-bold text-[#A35139]">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-[#1B2632] mb-1">
                        Choose an album
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Select the perfect collection for your stories
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#A35139]/10 flex items-center justify-center font-bold text-[#A35139]">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-[#1B2632] mb-1">
                        Enter your details
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We just need your name and number
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#A35139]/10 flex items-center justify-center font-bold text-[#A35139]">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-[#1B2632] mb-1">
                        We message you on Whatsapp to start!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Look out for a message from us
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border shadow-sm mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-[#1B2632]">
              Ready to Begin?
            </h2>
            <p className="text-muted-foreground">
              Enter your WhatsApp number and we'll send you your first question
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="buyerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-[#1B2632]">
                      Your Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter your full name"
                        className="h-12 text-base"
                        data-testid="input-buyer-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-[#1B2632]">
                      Your Whatsapp Number
                    </FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        defaultCountry="IN"
                        data-testid="input-customer-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storytellerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-[#1B2632]">
                      Who's Kahani do you want to record? (what do you call
                      them?)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Mom, Dad, Dadu, Nani, etc"
                        className="h-12 text-base"
                        data-testid="input-storyteller-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden field for selected album */}
              <FormField
                control={form.control}
                name="selectedAlbum"
                render={({ field }) => <input type="hidden" {...field} />}
              />

              <div className="flex justify-center mt-8">
                <Button
                  type="submit"
                  size="lg"
                  className="w-auto px-10 text-lg h-14 bg-[#A35139] text-white rounded-2xl shadow-xl border border-[#A35139] hover:bg-[#A35139]/90 transition-all duration-300"
                  disabled={freeTrialMutation.isPending}
                  data-testid="button-start-trial"
                >
                  {freeTrialMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Starting Your Trial...
                    </>
                  ) : (
                    "Record Now"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Trust Section */}
        <div className="text-center space-y-3 pt-6 pb-2">
          <div className="flex items-center justify-center gap-2 text-[#1B2632]/80 font-medium">
            <span>Spreading love. 1,000+ kahaniya recorded</span>
            <Heart className="h-4 w-4 fill-[#A35139] text-[#A35139]" />
          </div>
          <div>
            <a
              href="https://wa.me/?text=Hi%2C%20I%20have%20a%20question%20about%20the%20free%20trial."
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A35139] hover:text-[#A35139]/80 font-semibold text-sm transition-colors inline-block"
            >
              Contact us
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
