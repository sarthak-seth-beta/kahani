import { useState, useEffect, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useGeneratedAlbum } from "@/stores/generatedAlbumStore";
import { getOrCreateSessionId } from "@/lib/sessionId";

const toneEnum = z.enum(["warm", "respectful", "funny", "calm"]);
const albumGoalEnum = z.enum([
  "stories",
  "family_history",
  "values_lessons",
  "voice_future",
]);

const createAlbumSchema = z.object({
  recipientName: z.string().min(2, "Who is this for? is required"),
  language: z.enum(["en", "hn"]),
  theme: z.string().min(2, "Theme is required"),
  personalHints: z.string().optional(),
  tone: toneEnum,
  albumGoal: z.array(albumGoalEnum).min(1, "Select at least one goal"),
  makeItPersonal: z.boolean().optional(),
  topicsToAvoid: z.string().optional(),
  questions: z
    .array(
      z.object({
        text: z.string(),
      })
    )
    .optional(),
});

type CreateAlbumFormValues = z.infer<typeof createAlbumSchema>;

const GENERATING_TEXTS = [
  "Picking the best story arcs…",
  "Creating chapter names…",
  "Writing thoughtful questions…",
  "Making it sound natural…",
  "Final polishing…",
];

export default function CreateAlbum() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setGeneratedAlbum } = useGeneratedAlbum();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [generatingText, setGeneratingText] = useState("");
  const generatingTextIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<CreateAlbumFormValues>({
    resolver: zodResolver(createAlbumSchema),
    defaultValues: {
      recipientName: "",
      language: "en",
      theme: "",
      personalHints: "",
      tone: "warm",
      albumGoal: ["stories"],
      makeItPersonal: false,
      topicsToAvoid: "",
      questions: [{ text: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Rotate generating text while album is being generated
  useEffect(() => {
    if (isGenerating) {
      let currentIndex = 0;
      setGeneratingText(GENERATING_TEXTS[currentIndex]);

      generatingTextIntervalRef.current = setInterval(() => {
        currentIndex = (currentIndex + 1) % GENERATING_TEXTS.length;
        setGeneratingText(GENERATING_TEXTS[currentIndex]);
      }, 1500); // Change text every 1.5 seconds

      return () => {
        if (generatingTextIntervalRef.current) {
          clearInterval(generatingTextIntervalRef.current);
          generatingTextIntervalRef.current = null;
        }
      };
    } else {
      setGeneratingText("");
      if (generatingTextIntervalRef.current) {
        clearInterval(generatingTextIntervalRef.current);
        generatingTextIntervalRef.current = null;
      }
    }
  }, [isGenerating]);

  const handleGenerateAlbum = async () => {
    const valid = await form.trigger([
      "recipientName",
      "theme",
      "tone",
      "albumGoal",
    ]);
    if (!valid) {
      toast({
        title: "Please fill required fields",
        description:
          "Who is this for, theme, tone, and at least one album goal are required.",
        variant: "destructive",
      });
      return;
    }

    const data = form.getValues();
    const validQuestions = data.questions?.filter(
      (q) => q.text.trim().length > 0,
    );
    const payload = {
      recipientName: data.recipientName,
      language: data.language,
      theme: data.theme,
      personalHints: data.personalHints || undefined,
      tone: data.tone,
      albumGoal: data.albumGoal,
      makeItPersonal: data.makeItPersonal,
      topicsToAvoid: data.topicsToAvoid || undefined,
      questions: validQuestions,
    };

    setIsGenerating(true);
    try {
      const isDevMode =
        new URLSearchParams(window.location.search).get("mode") === "enzo";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Session-Id": getOrCreateSessionId(),
      };
      if (isDevMode) headers["X-Dev-Mode"] = "enzo";

      const response = await fetch("/api/generate-album", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        const msg = result.error || "Failed to generate album";
        // If server returns old validation message, suggest refresh/restart
        if (typeof msg === "string" && /yourName|phone.*occasion|occasion.*phone/.test(msg)) {
          throw new Error(
            "Server is using an old version. Please restart the dev server (stop and run yarn dev again), then try again.",
          );
        }
        throw new Error(msg);
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
      const validQuestions = data.questions?.filter(
        (q) => q.text.trim().length > 0,
      );
      const submissionData = {
        title: `${data.recipientName}'s Album`,
        recipientName: data.recipientName,
        theme: data.theme,
        occasion: data.theme,
        language: data.language,
        personalHints: data.personalHints,
        instructions: data.personalHints,
        tone: data.tone,
        albumGoal: data.albumGoal,
        makeItPersonal: data.makeItPersonal,
        topicsToAvoid: data.topicsToAvoid,
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
            {/* 1. Who is this for? */}
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    Who is this for?
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Mom / Dad / Nanu / Sister"
                      className="h-11 text-sm sm:text-base bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. Language (for your storyteller) */}
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    Language (for your storyteller)
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 bg-white">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hn">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 3. Theme */}
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    Theme
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="army life, cooking, childhood, career, family stories"
                      className="h-11 text-sm sm:text-base bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 4. A few personal hints */}
            <FormField
              control={form.control}
              name="personalHints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    A few personal hints
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Where they grew up, what they're known for, what you want to learn..."
                      className="min-h-[100px] text-sm sm:text-base bg-white resize-none"
                    />
                  </FormControl>
                  <p className="text-xs text-[#1B2632]/60">
                    2–5 lines is enough. Examples: where they grew up, what
                    they&apos;re known for, what you want to learn.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 5. Tone */}
            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    Tone
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 bg-white">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="warm">Warm & casual</SelectItem>
                      <SelectItem value="respectful">Respectful & formal</SelectItem>
                      <SelectItem value="funny">Funny & light</SelectItem>
                      <SelectItem value="calm">Calm & emotional</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 6. What should the album achieve? */}
            <FormField
              control={form.control}
              name="albumGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                    What should the album achieve?
                  </FormLabel>
                  <div className="space-y-3 rounded-md border border-[#C9C1B1]/30 p-4 bg-white/50">
                    {[
                      { value: "stories" as const, label: "Capture stories" },
                      { value: "family_history" as const, label: "Capture family history" },
                      { value: "values_lessons" as const, label: "Capture values & lessons" },
                      { value: "voice_future" as const, label: "Capture voice for the future" },
                    ].map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`albumGoal-${option.value}`}
                          checked={field.value?.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...(field.value || []), option.value]
                              : (field.value || []).filter(
                                  (v) => v !== option.value
                                );
                            field.onChange(next);
                          }}
                        />
                        <label
                          htmlFor={`albumGoal-${option.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Customization Toggle */}
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
                {/* Make it more personal */}
                <FormField
                  control={form.control}
                  name="makeItPersonal"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={(v) =>
                            field.onChange(v === true)
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Make it more personal
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Topics to avoid */}
                <FormField
                  control={form.control}
                  name="topicsToAvoid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                        Topics to avoid
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. health issues, financial struggles"
                          className="h-11 bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Any specific questions you want included? */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                      Any specific questions you want included?
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
              onClick={handleGenerateAlbum}
              disabled={isSubmitting || isGenerating}
              className="w-full h-12 sm:h-14 text-base sm:text-lg bg-[#A35139] hover:bg-[#8B4430] text-white rounded-xl shadow-md transition-all duration-300 mt-4"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {generatingText || "Generating..."}
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
              variant="outline"
              className="w-full h-11 sm:h-12 text-base border-[#A35139] text-[#A35139] hover:bg-[#A35139]/10 rounded-xl mt-4"
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
