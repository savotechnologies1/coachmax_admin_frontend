import { formatTimestampDate } from "../../utils/dateTime";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { getAllNews, deleteNews, getNewsCategories } from "../../api/adminApi";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import {
  Edit2,
  Trash2,
  Clock,
  Bookmark,
  Search,
  Plus
} from "lucide-react";
import toast from "react-hot-toast";
import EditNewsModal from "../../components/ContentManagement/EditNewsModal";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import { getMediaUrl } from "../../utils/media";

const ContentListPage = ({ type = "news" }) => {
  const [activeTab, setActiveTab] = useState("Latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [newsCategories, setNewsCategories] = useState<string[]>(["Latest", "Business", "Sports", "League"]);

  const blogTabs = ["All Posts", "Training", "Nutrition", "Analysis"];
  const tabs = type === "news" ? newsCategories : blogTabs;

  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNews, setEditingNews] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await getAllNews();
      if (res.success) {
        const mappedNews = res.data.map((item: any) => {
          let imageUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=600&auto=format&fit=crop";
          if (item.images && item.images.length > 0) {
            imageUrl = getMediaUrl(item.images[0].replace(/\\/g, "/"), imageUrl);
          }

          return {
            id: item._id,
            title: item.title,
            category: item.category,
            readTime: "5 min read", // Mock
            timeAgo: formatTimestampDate(item.publishedAt || item.createdAt),
            image: imageUrl,
            isFeatured: item.featured,
            description: item.description,
            author: item.publishedBy?.name || "Admin"
          };
        });
        setContentItems(mappedNews);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (type === "news") {
      fetchNews();
      const fetchCategories = async () => {
        try {
          const res = await getNewsCategories();
          if (res && res.success) {
            const data = res.data || res;
            if (Array.isArray(data)) {
              const parsed = data.map((c: any) => typeof c === 'string' ? c : (c.name || c.title || ""));
              const uniqueCategories = Array.from(new Set(["Latest", ...parsed.filter(Boolean)]));
              setNewsCategories(uniqueCategories);
            }
          }
        } catch (error) {
          console.error("Error fetching news categories:", error);
        }
      };
      fetchCategories();
    } else {
      // Keep mock data for blog type for now
      setContentItems([
        {
          id: 1,
          title: "Real Madrid confirm Xabi Alonso as new head coach",
          category: "la liga",
          readTime: "5 min read",
          timeAgo: "5 hours ago",
          image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=600&auto=format&fit=crop",
          isFeatured: true,
          description: "A detailed look into the recent changes in management at Real Madrid.",
          author: "Super Admin"
        },
        {
          id: 2,
          title: "Tactical breakdown of the Premier League's top contenders",
          category: "analysis",
          readTime: "8 min read",
          timeAgo: "1 day ago",
          image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=200&auto=format&fit=crop",
          isFeatured: false,
          description: "An in-depth tactical analysis of the top teams competing for the Premier League title this season.",
          author: "Super Admin"
        }
      ]);
      setLoading(false);
    }
  }, [type]);

  const handleEdit = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNews(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteNews(itemToDelete);
      toast.success("News deleted successfully");
      setContentItems(prev => prev.filter(item => item.id !== itemToDelete));
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting news:", error);
      toast.error("Failed to delete news.");
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const isSearching = searchQuery.trim().length > 0;
  const query = searchQuery.toLowerCase();

  const featured = isSearching
    ? null
    : contentItems.find(item => {
      if (!item.isFeatured) return false;
      const isLatestOrAll = activeTab === "Latest" || activeTab === "All Posts" || activeTab === "All";
      if (isLatestOrAll) return true;
      return item.category?.toLowerCase() === activeTab.toLowerCase();
    });

  const items = contentItems
    .filter(item => {
      if (featured && item.id === featured.id) return false;
      return true;
    })
    .filter(item => {
      const isLatestOrAll = activeTab === "Latest" || activeTab === "All Posts" || activeTab === "All";
      if (!isLatestOrAll) {
        if (item.category?.toLowerCase() !== activeTab.toLowerCase()) return false;
      }

      if (isSearching) {
        return (
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
        );
      }

      return true;
    });

  return (
    <>
      <PageMeta
        title={`CoachMax | ${type === "news" ? "News & Updates" : "Blogs & Analysis"}`}
        description={`Manage the coachmax ${type} platform.`}
      />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle={type === "news" ? "News & Updates" : "Blogs & Hub"}>
          {type === "news" && (
            <Link
              to="/add-content"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-theme-xs transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <Plus size={16} aria-hidden="true" />
              Add News
            </Link>
          )}
        </PageBreadcrumb>

        {/* Categories Tab Bar & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-2">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-bold whitespace-nowrap transition-all border-b-2 pb-2 -mb-[10px] ${activeTab === tab
                    ? "text-brand-500 border-brand-500"
                    : "text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-none outline-none focus:border-[#0047FF] focus:ring-1 focus:ring-[#0047FF] dark:text-white"
            />
          </div>
        </div>

        {/* Main Content Layout */}
        {loading ? (
          <div className="flex justify-center items-center py-40">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left: Featured & Main List */}
            <div className="lg:col-span-12 space-y-8">
              {/* Featured Banner Card */}
              {featured && (
                <div className="relative h-[480px] rounded-none overflow-hidden group shadow-2xl">
                  {type === "news" ? (
                    <Link to={`/news/${featured.id}`}>
                      <div
                        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url(${featured.image})` }}
                      />
                    </Link>
                  ) : (
                    <div
                      className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${featured.image})` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none"></div>
                  <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
                    <div
                      onClick={(e) => handleEdit(featured, e)}
                      className="p-3 bg-blue-600 text-white rounded-none shadow-lg shadow-blue-600/40 hover:bg-blue-700 cursor-pointer transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={20} />
                    </div>
                    <div
                      onClick={(e) => handleDeleteClick(featured.id, e)}
                      className="p-3 bg-red-600 text-white rounded-none shadow-lg shadow-red-600/40 hover:bg-red-700 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={20} />
                    </div>
                    <div className="p-3 bg-brand-500 text-white rounded-none shadow-lg shadow-brand-500/40">
                      <Bookmark size={20} fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-10 left-10 right-10 z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-brand-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold  shadow-lg">
                        {featured.category}
                      </span>
                      <span className="text-white/80 text-[10px] font-bold  flex items-center gap-1.5">
                        <Clock size={12} /> {featured.readTime}
                      </span>
                    </div>
                    {type === "news" ? (
                      <Link to={`/news/${featured.id}`}>
                        <h2 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-md lg:w-3/4 hover:text-brand-400 transition-colors cursor-pointer">
                          {featured.title}
                        </h2>
                      </Link>
                    ) : (
                      <h2 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-md lg:w-3/4">
                        {featured.title}
                      </h2>
                    )}
                    {/* <div className="flex items-center justify-between">
               <span className="text-white/60 text-xs font-bold  ">{featured.timeAgo}</span>
               <div className="flex items-center gap-4 text-white/80">
                <span className="flex items-center gap-1 text-xs"><Eye size={14}/> 1.2k</span>
                <span className="flex items-center gap-1 text-xs"><Heart size={14}/> 428</span>
               </div>
             </div> */}
                  </div>
                </div>
              )}

              {/* Feed List Items */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 mb-6">Latest Feed</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map(item => (
                    <div key={item.id} className="flex flex-col bg-white dark:bg-gray-900/50 rounded-none border border-gray-100 dark:border-gray-800/60 hover:border-brand-500/30 transition-all hover:-translate-y-1 shadow-sm">
                      <div className="w-full aspect-[4/3] overflow-hidden flex-shrink-0 bg-slate-50 dark:bg-slate-900">
                        {type === "news" ? (
                          <Link to={`/news/${item.id}`}>
                            <div
                              className="w-full h-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                              style={{ backgroundImage: `url(${item.image})` }}
                            />
                          </Link>
                        ) : (
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.image})` }}
                          />
                        )}
                      </div>
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-bold text-brand-500 underline underline-offset-4 decoration-2 capitalize">
                              {item.category}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold truncate">
                              {item.author}
                            </span>
                          </div>
                          {type === "news" ? (
                            <Link to={`/news/${item.id}`}>
                              <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 leading-snug hover:text-brand-500 transition-colors">
                                {item.title}
                              </h4>
                            </Link>
                          ) : (
                            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 leading-snug">
                              {item.title}
                            </h4>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-[10px] font-bold text-gray-400">{item.timeAgo}</span>
                          <div className="flex items-center gap-2">
                            <div
                              onClick={(e) => handleEdit(item, e)}
                              className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-none text-blue-500 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors shadow-sm"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </div>
                            <div
                              onClick={(e) => handleDeleteClick(item.id, e)}
                              className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-none text-red-500 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors shadow-sm"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </div>
                            <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-none text-gray-400 hover:text-brand-500 cursor-pointer transition-colors shadow-sm">
                              <Bookmark size={14} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>


          </div>
        )}
      </div>
      <EditNewsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => fetchNews()}
        newsItem={editingNews}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title="Delete News"
        message="Are you sure you want to delete this news article? This action cannot be undone."
      />
    </>
  );
};

export default ContentListPage;
