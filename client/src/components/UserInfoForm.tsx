import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
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
import { PhoneInput } from "@/components/PhoneInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema } from "@shared/schema";

type UserInfoFormData = z.infer<typeof insertTransactionSchema>;

interface UserInfoFormProps {
  albumId: string;
  packageType: "digital" | "ebook" | "printed";
  discountCode?: string;
  onBack?: () => void;
  onSuccess?: () => void;
  isSoloMode?: boolean;
}

export function UserInfoForm({
  albumId,
  packageType,
  discountCode,
  onBack,
  onSuccess,
  isSoloMode = false,
}: UserInfoFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm<UserInfoFormData>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      name: "",
      phone: "",
      phoneE164: "",
      albumId,
      packageType,
      storytellerName: "",
      storytellerLanguagePreference: "en",
    },
  });

  const onSubmit = async (data: UserInfoFormData) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/transactions", data);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create transaction record",
        );
      }

      const transaction = await response.json();

      // Show redirecting state
      setIsRedirecting(true);

      // Navigate to payment page with transactionId, phone, and optional discount code
      const paymentParams = new URLSearchParams({
        transactionId: transaction.id,
        phone: data.phone,
        albumId,
        packageType,
      });
      if (discountCode) {
        paymentParams.set("discountCode", discountCode);
      }
      if (isSoloMode) {
        paymentParams.set("mode", "solo");
      }
      setLocation(`/payment?${paymentParams.toString()}`);

      // Call onSuccess to close the dialog if provided (after navigation starts)
      if (onSuccess) {
        setTimeout(() => onSuccess(), 100);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to save your information. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      setIsRedirecting(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="text-center">
          <h2 className="text-lg font-bold mb-2 text-[#1B2632]">
            Enter Your Details
          </h2>
          {/* <p className="text-muted-foreground text-sm">
            We'll use these details to process your payment and keep you updated
          </p> */}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-[#1B2632]">
                    Your Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Enter your name"
                      className="h-11 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-[#1B2632]">
                    Your Phone Number
                  </FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Store E164 format for backend
                        form.setValue("phoneE164", value);
                      }}
                      defaultCountry="IN"
                    />
                  </FormControl>
                  <p className="text-xs text-[#1B2632]/60 mt-1">
                    We'll send payment confirmation to this number
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSoloMode && (
              <FormField
                control={form.control}
                name="storytellerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-[#1B2632]">
                      What you call them with love!
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Mom / Dad / Amma / Nani"
                        className="h-11 text-sm"
                        data-testid="input-storyteller-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="storytellerLanguagePreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-[#1B2632]">
                    {isSoloMode
                      ? "What's your preferred language?"
                      : "What is their preferred language?"}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue="en"
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 text-sm">
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

            <div className="flex justify-center mt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full text-base h-12 bg-[#A35139] text-white rounded-xl shadow-md hover:bg-[#A35139]/90 transition-all duration-300"
                disabled={isSubmitting || isRedirecting}
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirecting...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            </div>

            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to packages
              </Button>
            )}
          </form>
        </Form>
      </div>
    </>
  );
}
