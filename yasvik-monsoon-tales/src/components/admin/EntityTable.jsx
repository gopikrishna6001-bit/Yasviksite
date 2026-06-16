import { motion } from 'framer-motion';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

export default function EntityTable({ items, columns, onEdit, onDelete, onTogglePublish, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-temple-stone/20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="text-center py-16">
        <p className="font-inter text-sm text-rain-cloud/40">Nothing here yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col.key} className="text-left py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">
                {col.label}
              </th>
            ))}
            <th className="text-right py-3 px-4 font-inter text-[11px] text-rain-cloud/40 uppercase tracking-wider font-normal">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <motion.tr
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="border-b border-border/50 hover:bg-white/60 transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="py-3.5 px-4">
                  {col.render ? col.render(item) : (
                    <span className="font-inter text-sm text-rain-cloud/80">
                      {item[col.key] ?? '—'}
                    </span>
                  )}
                </td>
              ))}
              <td className="py-3.5 px-4">
                <div className="flex items-center justify-end gap-2">
                  {onTogglePublish && (
                    <button
                      onClick={() => onTogglePublish(item)}
                      className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-forest-canopy hover:bg-forest-canopy/10 transition-all"
                      title={item.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {item.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-wet-earth hover:bg-wet-earth/10 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="p-1.5 rounded-lg text-rain-cloud/35 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}