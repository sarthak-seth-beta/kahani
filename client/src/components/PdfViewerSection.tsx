import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const pdfFile = "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/sample.pdf";

export default function PdfViewerSection() {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setIsLoading(false);
    }

    // Track when pages finish loading
    const handlePageLoadSuccess = useCallback((page: number) => {
        setLoadedPages(prev => new Set(prev).add(page));
    }, []);

    function previousPage() {
        if (isTransitioning) return;
        const newPage = Math.max(pageNumber - 1, 1);
        if (newPage !== pageNumber) {
            setIsTransitioning(true);
            setPageNumber(newPage);
            setTimeout(() => setIsTransitioning(false), 150);
        }
    }

    function nextPage() {
        if (isTransitioning) return;
        const newPage = Math.min(pageNumber + 1, numPages);
        if (newPage !== pageNumber) {
            setIsTransitioning(true);
            setPageNumber(newPage);
            setTimeout(() => setIsTransitioning(false), 150);
        }
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isTransitioning) return;
            
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                const newPage = Math.max(pageNumber - 1, 1);
                if (newPage !== pageNumber) {
                    setIsTransitioning(true);
                    setPageNumber(newPage);
                    setTimeout(() => setIsTransitioning(false), 150);
                }
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                const newPage = Math.min(pageNumber + 1, numPages);
                if (newPage !== pageNumber) {
                    setIsTransitioning(true);
                    setPageNumber(newPage);
                    setTimeout(() => setIsTransitioning(false), 150);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pageNumber, numPages, isTransitioning]);

    // Measure container width for responsive PDF
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    return (
        <section className="py-6 sm:py-8 md:py-12 lg:py-16 w-full flex flex-col items-center" id="pdf-viewer">
            
            {/* Title */}
            <h2 className="text-3xl md:text-5xl font-bold font-['Outfit'] text-[#1B2632] tracking-wider mb-8 text-center">
                Our Album Book
            </h2>

            {/* PDF Container */}
            <div 
                ref={containerRef}
                className="bg-white rounded-lg xs:rounded-xl shadow-2xl overflow-hidden w-[calc(100%-1rem)] xs:w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] md:max-w-[20rem] md:max-h-[30rem] lg:max-w-[20rem] lg:max-h-[30rem] mx-2 xs:mx-3 sm:mx-4 md:mx-auto lg:mx-auto relative"
                style={{ minHeight: isLoading ? '400px' : 'auto' }}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:max-w-[20rem] md:max-h-[30rem] md:m-auto lg:max-w-[20rem] lg:max-h-[30rem] lg:m-auto">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-slate-400" />
                        <p className="text-slate-500 text-sm">Loading PDF...</p>
                    </div>
                )}
                
                <Document
                    // file="/sample.pdf"
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading=""
                    className={isLoading ? 'hidden' : ''}
                    // style={{ margin: 0, padding: 0, display: 'block', lineHeight: 0 }}
                >
                    {containerWidth > 0 && (
                        <>
                            {/* Current Page - Visible with fade transition */}
                            <div 
                                style={{
                                    opacity: isTransitioning ? 0.7 : 1,
                                    transition: 'opacity 150ms ease-in-out',
                                    margin: 0,
                                    padding: 0,
                                    display: 'block',
                                    lineHeight: 0
                                }}
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    width={containerWidth}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    loading=""
                                    onLoadSuccess={() => handlePageLoadSuccess(pageNumber)}
                                />
                            </div>
                            
                            {/* Preload Previous Page (Hidden) */}
                            {pageNumber > 1 && (
                                <div style={{ 
                                    position: 'absolute', 
                                    visibility: 'hidden',
                                    pointerEvents: 'none',
                                    width: 0,
                                    height: 0,
                                    overflow: 'hidden'
                                }}>
                                    <Page
                                        pageNumber={pageNumber - 1}
                                        width={containerWidth}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        loading=""
                                        onLoadSuccess={() => handlePageLoadSuccess(pageNumber - 1)}
                                    />
                                </div>
                            )}
                            
                            {/* Preload Next Page (Hidden) */}
                            {pageNumber < numPages && (
                                <div style={{ 
                                    position: 'absolute', 
                                    visibility: 'hidden',
                                    pointerEvents: 'none',
                                    width: 0,
                                    height: 0,
                                    overflow: 'hidden'
                                }}>
                                    <Page
                                        pageNumber={pageNumber + 1}
                                        width={containerWidth}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        loading=""
                                        onLoadSuccess={() => handlePageLoadSuccess(pageNumber + 1)}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </Document>
            </div>

            {/* Navigation Controls - Below PDF */}
            {numPages > 0 && (
                <div className="mt-3 xs:mt-4 sm:mt-5 md:mt-5 lg:mt-5 flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-3 lg:gap-3 bg-slate-800/50 backdrop-blur-sm px-3 xs:px-4 sm:px-5 md:px-5 lg:px-5 py-1.5 xs:py-2 sm:py-2.5 md:py-2.5 lg:py-2.5 rounded-full">
                    <button
                        onClick={previousPage}
                        disabled={pageNumber <= 1 || isTransitioning}
                        className="p-1 xs:p-1.5 sm:p-2 md:p-2 lg:p-2 hover:bg-white/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white disabled:cursor-not-allowed active:scale-95"
                        aria-label="Previous Page"
                    >
                        <ChevronLeft className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 lg:w-5 lg:h-5" />
                    </button>

                    <div className="flex items-center gap-1.5 xs:gap-2 md:gap-2">
                        <span className="font-mono text-[10px] xs:text-xs sm:text-sm md:text-sm lg:text-sm font-medium text-white min-w-[60px] xs:min-w-[65px] sm:min-w-[75px] md:min-w-[75px] lg:min-w-[75px] text-center">
                            {pageNumber} of {numPages}
                        </span>
                    </div>

                    <button
                        onClick={nextPage}
                        disabled={pageNumber >= numPages || isTransitioning}
                        className="p-1 xs:p-1.5 sm:p-2 md:p-2 lg:p-2 hover:bg-white/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white disabled:cursor-not-allowed active:scale-95"
                        aria-label="Next Page"
                    >
                        <ChevronRight className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 lg:w-5 lg:h-5" />
                    </button>
                </div>
            )}
        </section>
    );
}
