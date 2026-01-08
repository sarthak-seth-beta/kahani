import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Loader2, Upload, Sparkles, Plus, Trash2, Mail, Phone } from "lucide-react";
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

// Schema for the form
const createAlbumSchema = z.object({
    title: z.string().min(2, "Album title is required"),
    recipientName: z.string().min(2, "Recipient name is required"),
    occasion: z.string().min(2, "Occasion is required"),
    language: z.enum(["en", "hn", "other"], {
        required_error: "Please select a language",
    }),
    instructions: z.string().optional(),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    questions: z.array(z.object({
        text: z.string().min(1, "Question cannot be empty")
    })).optional(),
});

type CreateAlbumFormValues = z.infer<typeof createAlbumSchema>;

export default function CreateAlbum() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateAlbumFormValues>({
        resolver: zodResolver(createAlbumSchema),
        defaultValues: {
            title: "",
            recipientName: "",
            occasion: "",
            language: "en",
            instructions: "",
            email: "",
            phone: "",
            questions: [{ text: "" }] // Start with one empty question
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    const onSubmit = async (data: CreateAlbumFormValues) => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        console.log("Form Submitted:", data);
        toast({
            title: "Request Received!",
            description: "We'll start crafting your custom album shortly.",
        });
        setIsSubmitting(false);
        // Optionally redirect or show success
        // setLocation("/all-albums"); 
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
                        Share a few details and we'll create a completely personalized audio experience.
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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
                                            placeholder="e.g. Grandpa's Childhood Stories"
                                            className="h-11 text-sm sm:text-base bg-white"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Contact Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-base font-semibold text-[#1B2632] flex items-center gap-2">
                                Contact Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                        className="h-11 pl-10 text-sm sm:text-base bg-white"
                                                    />
                                                </div>
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
                                            <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                                                Phone Number
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
                            </div>
                        </div>

                        {/* Recipient & Occasion Row (Stack on mobile, Row on sm) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                placeholder="e.g. Nanu"
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
                                            Occasion
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="e.g. 75th Birthday"
                                                className="h-11 text-sm sm:text-base bg-white"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                                            <SelectTrigger className="h-11 text-sm sm:text-base bg-white">
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

                        {/* Cover Photo Placeholder */}
                        <div className="space-y-2">
                            <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                                Cover Photo (Optional)
                            </FormLabel>
                            <div className="border-2 border-dashed border-[#C9C1B1] rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#F8F6F1] hover:bg-[#F0EBE0] transition-colors cursor-pointer group">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                    <Upload className="h-5 w-5 text-[#A35139]" />
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-[#1B2632]/70">
                                    Click to upload a cover photo
                                </span>
                                <span className="text-xs text-[#1B2632]/40 mt-1">
                                    JPG, PNG up to 5MB
                                </span>
                            </div>
                        </div>

                        {/* Custom Questions Section */}
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
                                    <div key={field.id} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                                        <FormField
                                            control={form.control}
                                            name={`questions.${index}.text`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder={`Question ${index + 1}`}
                                                            className="h-10 text-sm bg-white"
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
                                                className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {fields.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                    No questions added. Click "Add Question" to suggest topics.
                                </p>
                            )}
                        </div>

                        {/* Instructions */}
                        <FormField
                            control={form.control}
                            name="instructions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm sm:text-base font-semibold text-[#1B2632]">
                                        Special Instructions
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Any specific stories, themes, or memories you want to capture?"
                                            className="min-h-[120px] text-sm sm:text-base bg-white resize-none"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 sm:h-14 text-base sm:text-lg bg-[#A35139] hover:bg-[#8B4430] text-white rounded-xl shadow-md transition-all duration-300 mt-4"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Create My Album
                                </>
                            )}
                        </Button>

                    </form>
                </Form>
            </div>
        </div>
    );
}
