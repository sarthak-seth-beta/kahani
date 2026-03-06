import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Footer } from "@/components/Footer";

interface ContentBlock {
  type: "paragraph" | "heading" | "list" | "faq";
  text?: string;
  level?: 2 | 3;
  style?: "ordered" | "unordered";
  items?: string[] | { question: string; answer: string }[];
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  featured_image: string | null;
  excerpt: string | null;
  content: ContentBlock[];
  published: boolean;
  published_at: string | null;
  created_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderContentBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case "heading":
      if (block.level === 2) {
        return (
          <h2
            key={index}
            className="text-2xl sm:text-3xl font-bold text-[#1B2632] mt-10 mb-4"
          >
            {block.text}
          </h2>
        );
      }
      return (
        <h3
          key={index}
          className="text-xl sm:text-2xl font-semibold text-[#1B2632] mt-8 mb-3"
        >
          {block.text}
        </h3>
      );

    case "paragraph":
      return (
        <p
          key={index}
          className="text-lg leading-relaxed text-[#1B2632]/80 mb-4"
        >
          {block.text}
        </p>
      );

    case "list": {
      const listItems = block.items as string[];
      if (block.style === "ordered") {
        return (
          <ol
            key={index}
            className="list-decimal list-outside pl-6 space-y-2 text-lg text-[#1B2632]/80 mb-6"
          >
            {listItems.map((item, i) => (
              <li key={i} className="leading-relaxed pl-2">
                {item}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul
          key={index}
          className="list-disc list-outside pl-6 space-y-2 text-lg text-[#1B2632]/80 mb-6"
        >
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed pl-2">
              {item}
            </li>
          ))}
        </ul>
      );
    }

    case "faq": {
      const faqItems = block.items as { question: string; answer: string }[];
      return (
        <div key={index} className="space-y-6 mb-6">
          {faqItems.map((faq, i) => (
            <div key={i} className="border-b border-[#C9C1B1]/30 pb-5">
              <h4 className="text-lg font-semibold text-[#1B2632] mb-2">
                {faq.question}
              </h4>
              <p className="text-base leading-relaxed text-[#1B2632]/70">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

function BlogDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function BlogDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ slug: string }>();

  const {
    data: blog,
    isLoading,
    error,
  } = useQuery<BlogPost>({
    queryKey: ["/api/blogs", params.slug],
    enabled: !!params.slug,
  });

  return (
    <div className="min-h-screen bg-[#EEE9DF]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#EEE9DF]/95 backdrop-blur-sm border-b border-[#C9C1B1]/30 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 md:px-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/blogs")}
            className="w-9 h-9 xs:w-10 xs:h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/80 transition-all shadow-sm absolute left-2 xs:left-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <img
            src={kahaniLogo}
            alt="Kahani Logo"
            className="h-12 w-auto object-contain cursor-pointer"
            onClick={() => setLocation("/")}
          />

          <div className="w-[44px]" />
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-12">
        {/* Loading */}
        {isLoading && <BlogDetailSkeleton />}

        {/* Error / Not Found */}
        {error && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-[#1B2632] mb-4">
              Blog not found
            </h2>
            <p className="text-[#1B2632]/60 mb-8">
              The blog post you're looking for doesn't exist or has been
              removed.
            </p>
            <Button onClick={() => setLocation("/blogs")}>Back to Blogs</Button>
          </div>
        )}

        {/* Blog Content */}
        {!isLoading && blog && (
          <article>
            {/* Date & Keyword */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#1B2632]/50 mb-6">
              {(blog.published_at || blog.created_at) && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(blog.published_at || blog.created_at)}
                </span>
              )}
              {blog.primary_keyword && (
                <span className="flex items-center gap-1.5 bg-[#C9C1B1]/20 px-2.5 py-1 rounded-full text-xs font-medium">
                  <Tag className="h-3 w-3" />
                  {blog.primary_keyword}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B2632] leading-tight mb-8">
              {blog.title}
            </h1>

            {/* Featured Image */}
            {blog.featured_image && (
              <div className="rounded-xl overflow-hidden mb-10">
                <img
                  src={blog.featured_image}
                  alt={blog.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Content Blocks */}
            <div className="blog-content">
              {blog.content.map((block, i) => renderContentBlock(block, i))}
            </div>

            {/* Secondary Keywords Tags */}
            {blog.secondary_keywords && blog.secondary_keywords.length > 0 && (
              <div className="mt-12 pt-8 border-t border-[#C9C1B1]/30">
                <div className="flex flex-wrap gap-2">
                  {blog.secondary_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="bg-[#C9C1B1]/15 text-[#1B2632]/60 px-3 py-1.5 rounded-full text-xs font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Back to blogs */}
            <div className="mt-12 pt-8 border-t border-[#C9C1B1]/30 text-center">
              <Button
                variant="outline"
                onClick={() => setLocation("/blogs")}
                className="px-8"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                All Blog Posts
              </Button>
            </div>
          </article>
        )}
      </div>

      <Footer />
    </div>
  );
}
