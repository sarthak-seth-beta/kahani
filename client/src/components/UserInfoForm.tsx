import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Check } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
}

export function UserInfoForm({
  albumId,
  packageType,
  discountCode,
  onBack,
  onSuccess,
}: UserInfoFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<UserInfoFormData | null>(null);

  const form = useForm<UserInfoFormData>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      name: "",
      phone: "",
      phoneE164: "",
      albumId,
      packageType,
    },
  });

  const onSubmit = (data: UserInfoFormData) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/transactions", formData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create transaction record",
        );
      }

      const transaction = await response.json();

      toast({
        title: "Success",
        description: "Your information has been saved!",
      });

      // Navigate to payment page with transactionId, phone, and optional discount code
      const paymentParams = new URLSearchParams({
        transactionId: transaction.id,
        phone: formData.phone,
        albumId,
        packageType,
      });
      if (discountCode) {
        paymentParams.set("discountCode", discountCode);
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
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to packages
          </Button>
        )}

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold mb-2 text-[#1B2632]">
            Enter Your Details
          </h2>
          <p className="text-muted-foreground text-sm">
            We'll use these details to process your payment and keep you updated
          </p>
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

            <div className="flex justify-center mt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full text-base h-12 bg-[#A35139] text-white rounded-xl shadow-md hover:bg-[#A35139]/90 transition-all duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Details</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Please confirm your information is correct:</p>
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div>
                  <span className="font-semibold">Name:</span> {formData?.name}
                </div>
                <div>
                  <span className="font-semibold">Phone:</span>{" "}
                  {formData?.phone}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Edit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-[#A35139] hover:bg-[#A35139]/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm & Continue
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
