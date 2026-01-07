import { useMemo } from "react";
import { LargeAlbumCard } from "./LargeAlbumCard";
import { CompactAlbumCard } from "./CompactAlbumCard";
import { CustomAlbumCard } from "./CustomAlbumCard";
import type { Album } from "./AlbumCard";
import { useLocation } from "wouter";

interface AlbumMasonryGridProps {
    albums: Album[];
    hideRelation?: boolean;
    hideLikeButton?: boolean;
    showCompactDescription?: boolean;
    onCustomCardClick?: () => void;
}

export const AlbumMasonryGrid = ({
    albums,
    hideRelation = false,
    hideLikeButton = false,
    showCompactDescription = false,
    onCustomCardClick
}: AlbumMasonryGridProps) => {
    const [, setLocation] = useLocation();

    // Distribute albums into 2 columns
    const [leftColumn, rightColumn] = useMemo(() => {
        const left: Album[] = [];
        const right: Album[] = [];

        albums.forEach((album, index) => {
            if (index % 2 === 0) {
                left.push(album);
            } else {
                right.push(album);
            }
        });

        return [left, right];
    }, [albums]);

    const handleCardClick = (albumId: string) => {
        setLocation(`/free-trial?albumId=${encodeURIComponent(albumId)}`);
    };

    // Helper to decide which card to render based on position in its own column
    // This logic helps create the "Pinterest" offset look
    // Pattern: Large, Compact, Large... vs Compact, Large, Compact...
    const renderCard = (album: Album, columnIndex: number, cardIndex: number) => {
        // Determine card type based on column and index logic
        // Left Column (0): Large, Compact, Large, Compact...
        // Right Column (1): Compact, Large, Compact, Large... (Offset start)

        const isLarge = (columnIndex === 0 && cardIndex % 2 === 0) ||
            (columnIndex === 1 && cardIndex % 2 !== 0);

        if (album.id === 'custom-card-placeholder') {
            return (
                <CustomAlbumCard
                    key={album.id}
                    onClick={() => onCustomCardClick?.()}
                />
            );
        }

        if (isLarge) {
            return (
                <LargeAlbumCard
                    key={album.id}
                    album={album}
                    onClick={() => handleCardClick(album.id)}
                    hideRelation={hideRelation}
                    hideLikeButton={hideLikeButton}
                />
            );
        } else {
            return (
                <CompactAlbumCard
                    key={album.id}
                    album={album}
                    onClick={() => handleCardClick(album.id)}
                    hideRelation={hideRelation}
                    hideLikeButton={hideLikeButton}
                    showDescription={showCompactDescription}
                />
            );
        }
    };

    if (!albums || albums.length === 0) return null;

    return (
        <div className="flex gap-2 w-full max-w-7xl mx-auto">
            {/* Left Column */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
                {leftColumn.map((album, index) => renderCard(album, 0, index))}
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
                {/* Add a spacer or just start rendering? 
             Pinterest usually just flows. If we want visual offset we can start with Compact.
             Our logic above handles the mixing.
         */}
                {rightColumn.map((album, index) => renderCard(album, 1, index))}
            </div>
        </div>
    );
};
