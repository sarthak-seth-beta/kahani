import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/PhoneInput";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { insertFreeTrialSchema } from "@shared/schema";

type FreeTrialFormData = z.infer<typeof insertFreeTrialSchema>;

interface FreeTrialFormProps {
  albumId: string;
  albumTitle?: string;
  onSuccess?: () => void;
}

export function FreeTrialForm({
  albumId,
  albumTitle,
  onSuccess,
}: FreeTrialFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Extract package from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPackage = urlParams.get("package") || "digital";

  const form = useForm<FreeTrialFormData>({
    resolver: zodResolver(insertFreeTrialSchema),
    defaultValues: {
      customerPhone: "",
      buyerName: "",
      storytellerName: "",
      albumId: albumId || "",
      storytellerLanguagePreference: "en",
    },
  });

  const freeTrialMutation = useMutation({
    mutationFn: async (data: FreeTrialFormData) => {
      trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_STARTED, {
        album_id: data.albumId,
        album_title: albumTitle,
        language_preference: data.storytellerLanguagePreference,
      });
      const response = await apiRequest("POST", "/api/free-trial", data);
      if (!response.ok) {
        const errorData = await response.json();
        trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_ERROR, {
          error_message: errorData.error || "Failed to sign up",
          album_id: data.albumId,
        });
        throw new Error(errorData.error || "Failed to sign up");
      }
      return response.json();
    },
    onSuccess: async (trial) => {
      queryClient.invalidateQueries({ queryKey: ["/api/free-trial"] });

      trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_SUBMITTED, {
        trial_id: trial.id,
        album_id: form.getValues("albumId"),
        album_title: albumTitle,
        language_preference: form.getValues("storytellerLanguagePreference"),
      });

      // Send email for premium packages (ebook or printed)
      if (selectedPackage === "ebook" || selectedPackage === "printed") {
        try {
          const emailPayload = {
            packageType: selectedPackage,
            buyerName: form.getValues("buyerName"),
            customerPhone: form.getValues("customerPhone"),
            storytellerName: form.getValues("storytellerName"),
            languagePreference: form.getValues("storytellerLanguagePreference"),
            albumId: form.getValues("albumId"),
            albumTitle: albumTitle,
          };

          const emailResponse = await apiRequest("POST", "/api/premium-order-email", emailPayload);

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            console.error("Failed to send premium order email:", errorData);
            // Don't block the user flow if email fails
          } else {
            const successData = await emailResponse.json();
            console.log("Email sent successfully:", successData);
          }
        } catch (emailError) {
          console.error("Error sending premium order email:", emailError);
          // Don't block the user flow if email fails
        }
      } else {
        console.log("Digital package selected, skipping email notification");
      }

      form.reset();
      if (onSuccess) onSuccess();
      setLocation(`/thank-you?trialId=${trial.id}`);
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
    // Ensure albumId is set
    if (!data.albumId) data.albumId = albumId;

    freeTrialMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-md sm:text-xl font-bold mb-2 text-[#1B2632]">
          Ready to record some Kahani?
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Please enter your details, and not the details of the storyteller. We
          will reach out with the next steps on Whatsapp.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="buyerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                  Your Name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="What your loved ones call you!"
                    className="h-11 text-sm sm:text-base"
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
                <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
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
                <p className="text-xs text-[#1B2632]/60 mt-1">
                  We will send you an invite message to copy and share
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="storytellerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                  What you call them with love!
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="Mom / Dad / Amma / Nani"
                    className="h-11 text-sm sm:text-base"
                    data-testid="input-storyteller-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="storytellerLanguagePreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                  What is their preferred language?
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue="en"
                >
                  <FormControl>
                    <SelectTrigger className="h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hn">हिंदी (Hindi)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hidden field for selected album */}
          <FormField
            control={form.control}
            name="albumId"
            render={({ field }) => (
              <input type="hidden" {...field} value={albumId} />
            )}
          />

          <div className="flex justify-center mt-6">
            <Button
              type="submit"
              size="lg"
              className="w-full text-base sm:text-lg h-12 bg-[#A35139] text-white rounded-xl shadow-md hover:bg-[#A35139]/90 transition-all duration-300"
              disabled={freeTrialMutation.isPending}
              data-testid="button-start-trial"
            >
              {freeTrialMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Starting...
                </>
              ) : (
                "Continue to Whatsapp"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
