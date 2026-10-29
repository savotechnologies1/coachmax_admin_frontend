import { formatTimestampDate } from "../../utils/dateTime";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import DOMPurify from "dompurify";
import { getNewsById, deleteNews } from "../../api/adminApi";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import {
  Calendar,
  User,
  ArrowLeft,
  Edit2,
  Trash2,
  Bookmark,
  Newspaper
} from "lucide-react";
import toast from "react-hot-toast";
import EditNewsModal from "../../components/ContentManagement/EditNewsModal";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import { getMediaUrl } from "../../utils/media";

const NewsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [newsItem, setNewsItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNewsDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getNewsById(id);
      if (res && res.success) {
        setNewsItem(res.data);
      } else {
        toast.error("Failed to fetch news article details.");
      }
    } catch (error) {
      console.error("Error fetching news details:", error);
      toast.error("An error occurred while loading news article.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNewsDetails();
  }, [fetchNewsDetails]);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteNews(id);
      toast.success("News deleted successfully!");
      navigate("/news");
    } catch (error) {
      console.error("Error deleting news:", error);
      toast.error("Failed to delete news article.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="text-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <Newspaper className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">News Article Not Found</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">The article you are looking for does not exist or has been deleted.</p>
        <Link to="/news" className="inline-flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back to News & Updates
        </Link>
      </div>
    );
  }

  // Resolve Image URL
  let imageUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=600&auto=format&fit=crop";
  if (newsItem.images && newsItem.images.length > 0) {
    imageUrl = getMediaUrl(newsItem.images[0].replace(/\\/g, "/"), imageUrl);
  }

  const formattedDate = formatTimestampDate(newsItem.publishedAt || newsItem.createdAt);

  // Prepare standard mappedNews object for EditNewsModal compatibility
  const mappedNewsForEdit = {
    id: newsItem._id,
    _id: newsItem._id,
    title: newsItem.title,
    category: newsItem.category,
    image: imageUrl,
    isFeatured: newsItem.featured,
    description: newsItem.description,
    author: newsItem.publishedBy?.name || "Admin"
  };

  return (
    <>
      <PageMeta
        title={`CoachMax | ${newsItem.title}`}
        description={newsItem.description?.substring(0, 150).replace(/<[^>]*>/g, '') || "View breaking news and updates."}
      />
      <div className="space-y-6">
        <PageBreadcrumb
          pageTitle="News Details"
          items={[
            { name: "News & Updates", path: "/news" }
          ]}
        />

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden rounded-none p-6 md:p-8 space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <Link
              to="/news"
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft size={16} />
              Back to News
            </Link>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
                title="Edit Article"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
                title="Delete Article"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {/* Banner/Cover Image */}
          <div className="w-full flex justify-center items-center bg-slate-50 dark:bg-slate-900/40 border border-gray-100 dark:border-gray-800/80 p-2 overflow-hidden shadow-inner max-h-[500px]">
            <img
              src={imageUrl}
              alt={newsItem.title}
              className="max-h-[480px] w-auto h-auto object-contain transition-transform duration-700 hover:scale-[1.01]"
            />
          </div>

          {/* Article Info */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              <span className="bg-brand-500/10 text-brand-500 px-3 py-1 text-[10px] shadow-sm">
                {newsItem.category}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-gray-400" />
                Published By: {newsItem.publishedBy?.name || "Admin"}
              </span>
              {newsItem.featured && (
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 text-[10px] shadow-sm flex items-center gap-1">
                  <Bookmark size={10} fill="currentColor" /> Featured
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 dark:text-white leading-tight">
              {newsItem.title}
            </h1>
          </div>

          {/* Rich HTML Description */}
          <div 
            className="text-gray-700 dark:text-gray-300 text-sm md:text-base leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-6 max-w-none 
              [&_p]:mb-4 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
              [&_li]:mb-1
              [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-gray-950 [&_h1]:dark:text-white
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-gray-900 [&_h2]:dark:text-white
              [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-gray-900 [&_h3]:dark:text-white
              [&_strong]:font-bold [&_strong]:text-gray-900 [&_strong]:dark:text-white
              [&_a]:text-brand-500 [&_a]:underline [&_a]:hover:text-brand-600
              [&_img]:max-w-full [&_img]:h-auto [&_img]:my-6 [&_img]:mx-auto [&_img]:shadow-md
              [&_blockquote]:border-l-4 [&_blockquote]:border-brand-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-500 [&_blockquote]:dark:text-gray-400 [&_blockquote]:my-4"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(newsItem.description || "") }}
          />
        </div>
      </div>

      <EditNewsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchNewsDetails}
        newsItem={mappedNewsForEdit}
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

export default NewsDetails;
