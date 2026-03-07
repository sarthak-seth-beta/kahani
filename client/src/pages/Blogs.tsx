import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Footer } from "@/components/Footer";

interface BlogSummary {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  featured_image: string | null;
  excerpt: string | null;
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

function BlogCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-[#C9C1B1]/20">
      <Skeleton className="h-48 w-full" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export default function Blogs() {
  const [, setLocation] = useLocation();

  const {
    data: blogs,
    isLoading,
    error,
  } = useQuery<BlogSummary[]>({
    queryKey: ["/api/blogs"],
  });

  return (
    <div className="min-h-screen bg-[#EEE9DF]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#EEE9DF]/95 backdrop-blur-sm border-b border-[#C9C1B1]/30 shadow-sm">
        <div className="relative flex items-center justify-center px-6 py-4 md:px-12">
          <button
            id="blogs-back-home"
            onClick={() => setLocation("/")}
            className="w-9 h-9 xs:w-10 xs:h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/80 transition-all shadow-sm absolute left-2 xs:left-4 top-1/2 -translate-y-1/2"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 xs:w-5 xs:h-5 text-[#1B2632]" />
          </button>
          <img
            id="blogs-logo-home"
            src={kahaniLogo}
            alt="Kahani Logo"
            className="h-12 w-auto object-contain cursor-pointer"
            style={{ zIndex: 10 }}
            onClick={() => setLocation("/")}
          />
          <div className="w-[44px]" />
        </div>
      </header>

      {/* Page Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1B2632] mb-3">
            Our Blog
          </h1>
          <p className="text-lg text-[#1B2632]/60 max-w-2xl mx-auto">
            Stories, reflections, and guides to help you capture the memories
            that matter most.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <p className="text-[#1B2632]/60 text-lg">
              Something went wrong loading the blogs. Please try again later.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && blogs?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#1B2632]/60 text-lg">
              No blog posts yet. Check back soon!
            </p>
          </div>
        )}

        {/* Blog Cards Grid */}
        {!isLoading && blogs && blogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {blogs.map((blog) => (
              <article
                id={`blogs-card-${blog.slug}`}
                key={blog.id}
                onClick={() => setLocation(`/blogs/${blog.slug}`)}
                className="group bg-white rounded-xl overflow-hidden shadow-sm border border-[#C9C1B1]/20 hover:shadow-md hover:border-[#C9C1B1]/40 transition-all duration-200 cursor-pointer"
              >
                {/* Card Image */}
                <div className="relative h-48 bg-gradient-to-br from-[#C9C1B1]/30 to-[#EEE9DF] overflow-hidden">
                  {blog.featured_image ? (
                    <img
                      src={blog.featured_image}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={kahaniLogo}
                        alt="Kahani"
                        className="h-16 w-auto opacity-30"
                      />
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5">
                  {/* Date */}
                  {(blog.published_at || blog.created_at) && (
                    <div className="flex items-center gap-1.5 text-xs text-[#1B2632]/40 mb-3">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDate(blog.published_at || blog.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-[#1B2632] mb-2 line-clamp-2 group-hover:text-[#1B2632]/80 transition-colors">
                    {blog.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-[#1B2632]/60 line-clamp-3">
                    {blog.excerpt || blog.meta_description || ""}
                  </p>

                  {/* Read More */}
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#1B2632]/70 group-hover:text-[#1B2632] transition-colors">
                    <span>Read more</span>
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
