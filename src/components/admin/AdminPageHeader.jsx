export default function AdminPageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-cormorant text-2xl text-rain-cloud font-medium">{title}</h1>
        {description && (
          <p className="font-inter text-sm text-rain-cloud/45 mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}