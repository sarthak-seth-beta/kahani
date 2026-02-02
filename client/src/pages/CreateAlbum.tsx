import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Wand2,
  Plus,
  Trash2,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGeneratedAlbum } from "@/stores/generatedAlbumStore";

// Schema for the form
const createAlbumSchema = z.object({
  yourName: z.string().min(2, "Your name is required"),
  phone: z.string().min(10, "WhatsApp number is required"),
  recipientName: z.string().min(2, "Recipient name is required"),
  occasion: z.string().min(2, "Occasion is required"),
  instructions: z.string().optional(),

  // Advanced / Optional
  title: z.string().optional(),
  email: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .or(z.literal("")),
  language: z.enum(["en", "hn", "other"]).optional(),
  questions: z
    .array(
      z.object({
        text: z.string(),
      }),
    )
    .optional(),
});

type CreateAlbumFormValues = z.infer<typeof createAlbumSchema>;

export default function CreateAlbum() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setGeneratedAlbum } = useGeneratedAlbum();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const form = useForm<CreateAlbumFormValues>({
    resolver: zodResolver(createAlbumSchema),
    defaultValues: {
      yourName: "",
      phone: "",
      recipientName: "",
      occasion: "",
      instructions: "",
      title: "",
      email: "",
      language: "en",
      questions: [{ text: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const handleGenerateAlbum = async () => {
    const valid = await form.trigger([
      "yourName",
      "phone",
      "recipientName",
      "occasion",
    ]);
    if (!valid) {
      toast({
        title: "Please fill required fields",
        description: "Your name, phone, recipient, and occasion are required.",
        variant: "destructive",
      });
      return;
    }

    const data = form.getValues();
    const validQuestions = data.questions?.filter(
      (q) => q.text.trim().length > 0,
    );
    const payload = {
      ...data,
      title: data.title || undefined,
      questions: validQuestions,
    };

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to generate album");
      }

      setGeneratedAlbum(result, payload);
      setLocation("/generated-album");
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data: CreateAlbumFormValues) => {
    setIsSubmitting(true);
    try {
      // Filter out empty questions
      const validQuestions = data.questions?.filter(
        (q) => q.text.trim().length > 0,
      );

      // Include default title if empty
      const submissionData = {
        ...data,
        title: data.title || `${data.recipientName}'s Album`,
        questions: validQuestions,
      };

      const response = await fetch("/api/custom-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) throw new Error("Failed to submit");

      console.log("Form Submitted:", submissionData);
      toast({
        title: "Request Received!",
        description: "We'll start crafting your custom album shortly.",
      });
      setLocation("/all-albums");
    } catch (error) {
      console.error(error);
      toast({
        title: "Submission Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEE9DF] flex flex-col items-center py-6 px-4 sm:px-6 lg:px-8">
      {/* Header / Back Button */}
      <div className="w-full max-w-2xl mb-8 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/all-albums")}
          className="rounded-full bg-white/60 hover:bg-white/90 mr-4"
        >
          <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1B2632] font-['Outfit']">
          Create Custom Album
        </h1>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#C9C1B1]/20 p-6 sm:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-[#1B2632]">
            Tell us about your story
          </h2>
          <p className="text-sm text-[#1B2632]/60">
            We'll create a completely personalized audio experience.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 1. Your Name */}
            <FormField
              control={form.control}
              name="yourName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    Your Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Rahul"
                      className="h-11 text-sm sm:text-base bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. WhatsApp Number */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    WhatsApp Number
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        {...field}
                        placeholder="+91 98765 43210"
                        className="h-11 pl-10 text-sm sm:text-base bg-white"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 3. Recipient & Occasion Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                      Who is this for? (Relation)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Nani"
                        className="h-11 text-sm sm:text-base bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occasion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                      What do you want to capture?
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Childhood Stories"
                        className="h-11 text-sm sm:text-base bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 4. Instructions (Special Request) */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    Any special request? (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Specific memories or topics..."
                      className="min-h-[100px] text-sm sm:text-base bg-white resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 5. Advanced Customization Toggle */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="flex items-center gap-2 text-[#A35139] font-medium text-sm hover:underline focus:outline-none"
              >
                {isAdvancedOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Advanced Customization
              </button>
            </div>

            {/* Collapsible Section */}
            {isAdvancedOpen && (
              <div className="space-y-6 pt-2 animate-in slide-in-from-top-2 duration-300 border-t border-[#C9C1B1]/30 mt-2">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                        Album Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="My Family Album"
                          className="h-11 bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            placeholder="you@example.com"
                            className="h-11 pl-10 bg-white"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Language */}
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                        Preferred Language
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 bg-white">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hn">हिंदी (Hindi)</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Questions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                      Custom Questions
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ text: "" })}
                      className="h-8 text-xs sm:text-sm border-[#A35139] text-[#A35139] hover:bg-[#A35139]/10"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Add Question
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`questions.${index}.text`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder={`Question ${index + 1}`}
                                  className="h-10 bg-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="h-10 w-10 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Generate Album Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateAlbum}
              disabled={isSubmitting || isGenerating}
              className="w-full h-11 sm:h-12 text-base border-[#A35139] text-[#A35139] hover:bg-[#A35139]/10 rounded-xl mt-4"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generate an Album
                </>
              )}
            </Button>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 sm:h-14 text-base sm:text-lg bg-[#A35139] hover:bg-[#8B4430] text-white rounded-xl shadow-md transition-all duration-300 mt-4"
              disabled={isSubmitting || isGenerating}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Request My Album
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
