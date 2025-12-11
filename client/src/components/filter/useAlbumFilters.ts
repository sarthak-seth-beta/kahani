import { useState, useEffect, useMemo } from "react";

interface Album {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  best_fit_for?: string[] | null;
  keywords?: string[];
}

export function useAlbumFilters(albums: Album[] | undefined) {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "family" | "wisdom" | "love" | "career"
  >("all");
  const [filterBestFitFor, setFilterBestFitFor] = useState<string | null>(null);

  // Extract unique best_fit_for values from all albums
  const uniqueBestFitFor = useMemo(() => {
    if (!albums) return [];
    const allBestFitFor = albums
      .flatMap((album) => album.best_fit_for || [])
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(allBestFitFor)).sort();
  }, [albums]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(
      () => setSearchTerm(searchInput.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  // Generate keywords for albums based on their nature/type
  const getAlbumKeywords = (album: Album): string[] => {
    const keywords: string[] = [];
    
    // Add best_fit_for if available
    if (album.best_fit_for && Array.isArray(album.best_fit_for)) {
      keywords.push(...album.best_fit_for.map(k => k.toLowerCase()));
    }
    
    // Add custom keywords if provided
    if (album.keywords && Array.isArray(album.keywords)) {
      keywords.push(...album.keywords.map(k => k.toLowerCase()));
    }
    
    // Derive keywords from title and description
    const titleLower = album.title.toLowerCase();
    const descLower = (album.description || "").toLowerCase();
    
    // Common keywords based on album nature
    const keywordMap: Record<string, string[]> = {
      "family": ["family", "family history", "relatives", "ancestors", "heritage", "lineage"],
      "childhood": ["childhood", "youth", "early years", "growing up", "memories"],
      "love": ["love", "romance", "relationship", "partner", "marriage", "wedding"],
      "wisdom": ["wisdom", "lessons", "advice", "teachings", "values", "philosophy"],
      "money": ["money", "finance", "financial", "earnings", "wealth", "savings"],
      "home": ["home", "house", "household", "domestic", "homely"],
      "army": ["army", "military", "service", "duty", "discipline", "veteran"],
      "career": ["career", "work", "job", "profession", "occupation", "business"],
      "life": ["life", "journey", "path", "experience", "story"],
    };
    
    // Check for keyword matches in title and description
    Object.entries(keywordMap).forEach(([key, values]) => {
      if (titleLower.includes(key) || descLower.includes(key) || 
          values.some(v => titleLower.includes(v) || descLower.includes(v))) {
        keywords.push(...values);
      }
    });
    
    // Extract meaningful words from title
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
    keywords.push(...titleWords);
    
    return Array.from(new Set(keywords)); // Remove duplicates
  };

  const filteredAlbums = useMemo(() => {
    if (!albums) return [];
    return albums.filter((album) => {
      const keywords = getAlbumKeywords(album);
      const titleLower = album.title.toLowerCase();
      const descLower = (album.description || "").toLowerCase();
      
      // Apply type filter
      let matchesTypeFilter = true;
      if (filterType !== "all") {
        const filterKeywords: Record<string, string[]> = {
          family: ["family", "family history", "relatives", "ancestors", "heritage", "lineage", "childhood", "youth", "early years", "growing up"],
          wisdom: ["wisdom", "lessons", "advice", "teachings", "values", "philosophy", "life", "journey", "path", "experience"],
          love: ["love", "romance", "relationship", "partner", "marriage", "wedding", "home", "house", "household", "domestic"],
          career: ["career", "work", "job", "profession", "occupation", "business", "money", "finance", "financial", "earnings", "army", "military", "service", "duty"],
        };
        
        const categoryKeywords = filterKeywords[filterType] || [];
        matchesTypeFilter = categoryKeywords.some(keyword => 
          keywords.includes(keyword) || 
          titleLower.includes(keyword) || 
          descLower.includes(keyword)
        );
      }
      
      // Apply best_fit_for filter
      let matchesBestFitForFilter = true;
      if (filterBestFitFor) {
        const albumBestFitFor = (album.best_fit_for || []).map(bf => bf.toLowerCase());
        matchesBestFitForFilter = albumBestFitFor.includes(filterBestFitFor.toLowerCase());
      }
      
      // Apply search term filter
      if (searchTerm.length === 0) return matchesTypeFilter && matchesBestFitForFilter;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesTitle = titleLower.includes(searchLower);
      const matchesDescription = descLower.includes(searchLower);
      const matchesKeywords = keywords.some(keyword => keyword.includes(searchLower));
      const matchesSearch = matchesTitle || matchesDescription || matchesKeywords;
      
      return matchesTypeFilter && matchesBestFitForFilter && matchesSearch;
    });
  }, [albums, searchTerm, filterType, filterBestFitFor]);

  return {
    searchInput,
    setSearchInput,
    filterType,
    setFilterType,
    filterBestFitFor,
    setFilterBestFitFor,
    uniqueBestFitFor,
    filteredAlbums,
  };
}

