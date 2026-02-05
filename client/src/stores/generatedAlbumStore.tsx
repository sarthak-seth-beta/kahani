import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

const STORAGE_KEY = "generatedAlbum";

export interface GeneratedAlbumData {
  title: string;
  description: string;
  questions: string[];
  questionsHn?: string[];
  questionSetTitles?: { en: string[] };
  questionSetPremise?: { en: string[]; hn: string[] };
}

export interface GeneratedAlbumFormData {
  yourName: string;
  phone: string;
  recipientName: string;
  occasion: string;
  instructions?: string;
  title?: string;
  email?: string;
  language?: string;
  questions?: { text: string }[];
}

export interface GeneratedAlbumStoreValue {
  album: GeneratedAlbumData | null;
  formData: GeneratedAlbumFormData | null;
}

interface GeneratedAlbumContextValue {
  album: GeneratedAlbumData | null;
  formData: GeneratedAlbumFormData | null;
  setGeneratedAlbum: (
    album: GeneratedAlbumData | null,
    formData: GeneratedAlbumFormData | null,
  ) => void;
}

const GeneratedAlbumContext = createContext<GeneratedAlbumContextValue | null>(
  null,
);

function loadFromStorage(): {
  album: GeneratedAlbumData | null;
  formData: GeneratedAlbumFormData | null;
} {
  if (typeof window === "undefined") return { album: null, formData: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { album: null, formData: null };
    const parsed = JSON.parse(raw) as {
      album?: GeneratedAlbumData | null;
      formData?: GeneratedAlbumFormData | null;
    };
    const album = parsed?.album ?? null;
    const formData = parsed?.formData ?? null;
    if (album && formData) return { album, formData };
  } catch {
    /* ignore */
  }
  return { album: null, formData: null };
}

export function GeneratedAlbumProvider({ children }: { children: ReactNode }) {
  const [album, setAlbum] = useState<GeneratedAlbumData | null>(() => {
    const s = loadFromStorage();
    return s.album;
  });
  const [formData, setFormData] = useState<GeneratedAlbumFormData | null>(
    () => {
      const s = loadFromStorage();
      return s.formData;
    },
  );

  const setGeneratedAlbum = useCallback(
    (
      albumData: GeneratedAlbumData | null,
      formDataValue: GeneratedAlbumFormData | null,
    ) => {
      setAlbum(albumData);
      setFormData(formDataValue);
      if (albumData && formDataValue) {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ album: albumData, formData: formDataValue }),
        );
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    },
    [],
  );

  return (
    <GeneratedAlbumContext.Provider
      value={{ album, formData, setGeneratedAlbum }}
    >
      {children}
    </GeneratedAlbumContext.Provider>
  );
}

export function useGeneratedAlbum() {
  const ctx = useContext(GeneratedAlbumContext);
  if (!ctx) {
    throw new Error(
      "useGeneratedAlbum must be used within GeneratedAlbumProvider",
    );
  }
  return ctx;
}
