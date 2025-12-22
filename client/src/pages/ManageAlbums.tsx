import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertAlbumSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";

// Extended schema to include optional fields
const albumFormSchema = insertAlbumSchema.extend({
  questionsHn: z.array(z.string()).optional(),
  bestFitFor: z.array(z.string()).optional(),
});

type AlbumFormData = z.infer<typeof albumFormSchema>;

interface Album {
  id: string;
  title: string;
  description: string;
  questions: string[];
  questions_hn?: string[] | null;
  cover_image: string;
  best_fit_for?: string[] | null;
  is_active: boolean;
}

export default function ManageAlbums() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);

  // Fetch all albums
  const { data: albums, isLoading } = useQuery<Album[]>({
    queryKey: ["/api/admin/albums"],
  });

  const form = useForm<AlbumFormData>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      title: "",
      description: "",
      questions: [""],
      questionsHn: [],
      coverImage: "",
      bestFitFor: [],
      isActive: true,
    },
  });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const {
    fields: questionHnFields,
    append: appendQuestionHn,
    remove: removeQuestionHn,
  } = useFieldArray({
    control: form.control,
    name: "questionsHn",
  });

  const {
    fields: bestFitFields,
    append: appendBestFit,
    remove: removeBestFit,
  } = useFieldArray({
    control: form.control,
    name: "bestFitFor",
  });

  // Load album data for editing
  useEffect(() => {
    if (editingAlbumId && albums) {
      const album = albums.find((a) => a.id === editingAlbumId);
      if (album) {
        form.reset({
          title: album.title,
          description: album.description,
          questions: album.questions.length > 0 ? album.questions : [""],
          questionsHn: album.questions_hn || [],
          coverImage: album.cover_image,
          bestFitFor: album.best_fit_for || [],
          isActive: album.is_active,
        });
      }
    } else {
      form.reset({
        title: "",
        description: "",
        questions: [""],
        questionsHn: [],
        coverImage: "",
        bestFitFor: [],
        isActive: true,
      });
    }
  }, [editingAlbumId, albums, form]);

  const createMutation = useMutation({
    mutationFn: (data: AlbumFormData) =>
      apiRequest("POST", "/api/admin/albums", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/albums"] });
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      toast({
        title: "Success",
        description: "Album created successfully!",
      });
      form.reset();
      setEditingAlbumId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create album",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AlbumFormData }) =>
      apiRequest("PUT", `/api/admin/albums/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/albums"] });
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      toast({
        title: "Success",
        description: "Album updated successfully!",
      });
      form.reset();
      setEditingAlbumId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update album",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AlbumFormData) => {
    // Filter out empty questions
    const filteredData = {
      ...data,
      questions: data.questions.filter((q) => q.trim() !== ""),
      questionsHn: data.questionsHn?.filter((q) => q.trim() !== "") || [],
      bestFitFor: data.bestFitFor?.filter((b) => b.trim() !== "") || [],
    };

    if (editingAlbumId) {
      updateMutation.mutate({ id: editingAlbumId, data: filteredData });
    } else {
      createMutation.mutate(filteredData);
    }
  };

  const handleEdit = (album: Album) => {
    setEditingAlbumId(album.id);
  };

  const handleCancel = () => {
    setEditingAlbumId(null);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-[#FDF4DC] px-3 pt-3 pb-0">
      <div className="w-full mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/enzo-xyz")}
          className="mb-4 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>

        <Card className="mb-4">
          <CardHeader className="p-4">
            <CardTitle className="text-xl font-bold">
              {editingAlbumId ? "Update Album" : "Create New Album"}
            </CardTitle>
            <CardDescription className="text-xs">
              {editingAlbumId
                ? "Update the album details below"
                : "Fill in the details to create a new album"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Title *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Moments & Connections"
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe what this album is about..."
                          className="text-sm min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cover Image URL */}
                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Cover Image URL *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://images.unsplash.com/..."
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Questions (English) */}
                <div>
                  <FormLabel className="text-sm mb-2 block">
                    Questions (English) *
                  </FormLabel>
                  {questionFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`questions.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`Question ${index + 1}`}
                                className="text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {questionFields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendQuestion("")}
                    className="mt-2 text-xs"
                  >
                    <Plus size={14} />
                    Add Question
                  </Button>
                </div>

                {/* Questions (Hindi) - Optional */}
                <div>
                  <FormLabel className="text-sm mb-2 block">
                    Questions (Hindi) - Optional
                  </FormLabel>
                  {questionHnFields.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendQuestionHn("")}
                      className="mb-2 text-xs"
                    >
                      <Plus size={14} />
                      Add Hindi Questions
                    </Button>
                  )}
                  {questionHnFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`questionsHn.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`Hindi Question ${index + 1}`}
                                className="text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestionHn(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {questionHnFields.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendQuestionHn("")}
                      className="mt-2 text-xs"
                    >
                      <Plus size={14} />
                      Add More
                    </Button>
                  )}
                </div>

                {/* Best Fit For - Optional */}
                <div>
                  <FormLabel className="text-sm mb-2 block">
                    Best Fit For - Optional
                  </FormLabel>
                  {bestFitFields.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendBestFit("")}
                      className="mb-2 text-xs"
                    >
                      <Plus size={14} />
                      Add Tag
                    </Button>
                  )}
                  {bestFitFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`bestFitFor.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Families, Couples"
                                className="text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeBestFit(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {bestFitFields.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendBestFit("")}
                      className="mt-2 text-xs"
                    >
                      <Plus size={14} />
                      Add More
                    </Button>
                  )}
                </div>

                {/* Is Active */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm">
                        Album is active (visible to users)
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="flex-1"
                  >
                    {(createMutation.isPending ||
                      updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingAlbumId ? "Update Album" : "Create Album"}
                  </Button>
                  {editingAlbumId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Existing Albums List */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Existing Albums</CardTitle>
            <CardDescription className="text-xs">
              Click on an album to edit it
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-8 text-sm text-gray-500">
                Loading albums...
              </div>
            ) : albums && albums.length > 0 ? (
              <div className="space-y-2">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleEdit(album)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{album.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {album.description}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {album.questions.length} questions
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              album.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {album.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">
                No albums found. Create your first album above!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

