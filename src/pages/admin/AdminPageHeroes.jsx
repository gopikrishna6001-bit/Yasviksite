import PageHeroEditor from '@/components/admin/PageHeroEditor';

export default function AdminPageHeroes() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-cormorant text-3xl text-rain-cloud">Page Heroes</h1>
        <p className="font-inter text-sm text-rain-cloud/50 mt-1">Manage hero banners, slideshows, and media for each page</p>
      </div>
      <PageHeroEditor />
    </div>
  );
}