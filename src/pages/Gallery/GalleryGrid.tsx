import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import {
  Download,
  Maximize2,
  Camera,
  Search,
  Filter,
  Trash2,
  Calendar
} from "lucide-react";

const GalleryGrid = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Matches", "Training", "Travel", "Events"];

  // Mock data with varying aspect ratios to demo masonry layout
  const galleryItems = [
   { id: 1, title: "Training Drills", category: "Training", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-video" },
   { id: 2, title: "Match Day Pride", category: "Matches", image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-[3/4]" },
   { id: 3, title: "League Prep", category: "Training", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-[4/3]" },
   { id: 4, title: "Youth Camp", category: "Events", image: "https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-square" },
   { id: 5, title: "Penalty Practice", category: "Training", image: "https://images.unsplash.com/photo-1551280857-2b9bbe52cf5a?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-video" },
   { id: 6, title: "Team Celebration", category: "Matches", image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-[9/16]" },
   { id: 7, title: "Scouting Final", category: "Events", image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-[16/9]" },
   { id: 8, title: "Coach Session", category: "Training", image: "https://images.unsplash.com/photo-1431324155629-1a6eda1eedbc?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-square" },
   { id: 9, title: "Dressing Room", category: "Matches", image: "https://images.unsplash.com/photo-1516567727245-ad8c68f3ec1c?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-video" },
   { id: 10, title: "Victory Parade", category: "Events", image: "https://images.unsplash.com/photo-1563299796-17596ed6b017?q=80&w=400&auto=format&fit=crop", aspectRatio: "aspect-[3/2]" }
  ];

  const filteredItems = activeFilter === "All"
   ? galleryItems
   : galleryItems.filter(item => item.category === activeFilter);

  return (
   <>
     <PageMeta
      title="CoachMax | Gallery Assets"
      description="Manage the team's visual history with our cloud gallery."
     />
     <PageBreadcrumb pageTitle="Media Gallery" />
     <div className="space-y-6">
      {/* Filters & Tools */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-1">
         {filters.map((filter) => (
           <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`text-[11px] font-bold tracking-[0.15em] whitespace-nowrap transition-all border-b-2 pb-2 ${activeFilter === filter
              ? "text-brand-500 border-brand-500"
              : "text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200"
              }`}
           >
            {filter}
           </button>
         ))}
        </div>

        <div className="flex items-center gap-3">
         <div className="relative group">
           <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
           <input
            placeholder="Search gallery..."
            className="pl-9 pr-4 py-2 bg-white dark:bg-gray-900 rounded-none text-xs font-bold border border-gray-100 dark:border-gray-800 focus:border-brand-500 outline-none w-48 shadow-sm"
           />
         </div>
         <button className="p-2 bg-white dark:bg-gray-900 rounded-none border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-brand-500 shadow-sm transition-colors">
           <Filter size={18} />
         </button>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {filteredItems.map(item => (
         <div key={item.id} className="relative group rounded-none overflow-hidden cursor-crosshair break-inside-avoid shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-800/20">
           <img
            src={item.image}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
            alt={item.title}
           />

           {/* Visual Overlay Design (Mobile Ref) */}
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
               <div className="p-2 bg-white/10 backdrop-blur-md rounded-none text-white">
                 <Download size={16} />
               </div>
               <div className="p-2 bg-white/10 backdrop-blur-md rounded-none text-white">
                 <Maximize2 size={16} />
               </div>
              </div>
              <button className="p-2 bg-red-500 text-white rounded-none shadow-lg active:scale-95 transition-all">
               <Trash2 size={16} />
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-none transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
              <div className="flex items-center gap-2 mb-1">
               <Camera size={12} className="text-white/80" />
               <span className="text-[10px] font-bold  text-white/90">{item.category}</span>
              </div>
              <h4 className="text-white font-bold tracking-wide truncate">{item.title}</h4>
              <p className="text-[10px] text-white/50 font-bold  mt-2 flex items-center gap-1.5">
               <Calendar size={10} /> June 20, 2024
              </p>
            </div>
           </div>
         </div>
        ))}
      </div>

      {/* Empty State Mockup */}
      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
         <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
           <Camera size={32} className="text-gray-300" />
         </div>
         <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 ">No moments captured</h3>
         <p className="text-gray-400 text-sm mt-2 font-medium">Be the first to upload this category's media.</p>
        </div>
      )}
     </div>
   </>
  );
};

export default GalleryGrid;
