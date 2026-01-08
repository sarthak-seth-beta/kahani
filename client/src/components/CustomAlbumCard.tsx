import { Plus } from "lucide-react";

interface CustomAlbumCardProps {
  onClick: () => void;
}

export const CustomAlbumCard = ({ onClick }: CustomAlbumCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col w-full bg-gray-100 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-500 border border-gray-200"
    >
      {/* Same Aspect Ratio as CompactCard */}
      <div className="relative w-full aspect-[4/3] flex flex-col items-center justify-center bg-[#EEE9DF] group-hover:bg-[#E5E0D5] transition-colors duration-300 bg-[#FFFFFF]">
        {/* Dashed Border Inner Container for "Custom" feel */}
        <div className="absolute inset-4 border-2 border-dashed border-[#1B2632]/20 rounded-lg flex flex-col items-center justify-center gap-3">
          {/* Accessorize the Plus button */}
          <div className="w-12 h-12 rounded-full bg-[#A35139]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Plus className="w-6 h-6 text-[#A35139]" />
          </div>

          <span className="text-xs font-bold text-[#1B2632]/70 font-['Outfit'] uppercase tracking-wide">
            Custom Album
          </span>
        </div>
      </div>
    </div>
  );
};
