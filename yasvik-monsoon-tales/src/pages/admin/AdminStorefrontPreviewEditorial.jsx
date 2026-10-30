import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Film } from 'lucide-react';
import EditorialHomepage from '@/components/editorial/EditorialHomepage';

/**
 * Admin-only preview of the approved editorial storefront.
 * Does not change the public homepage. Feature flag editorial_storefront_public stays false.
 */
export default function AdminStorefrontPreviewEditorial() {
  return (
    <div className="relative min-h-0 flex-1 bg-warm-cream">
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/merchandising-review" className="inline-flex items-center gap-1.5 font-inter text-xs font-semibold text-deep-forest/70 hover:text-deep-forest">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-deep-forest">
            <Eye className="h-3 w-3" />
            Preview only · public homepage unchanged
          </span>
        </div>
        <Link
          to="/admin/storefront-stories"
          className="inline-flex items-center gap-1.5 font-inter text-xs font-semibold text-neon-paddy hover:text-deep-forest"
        >
          <Film className="h-3.5 w-3.5" />
          Manage Stories CMS
        </Link>
      </div>

      <EditorialHomepage includeDraftStories showChrome />
    </div>
  );
}
