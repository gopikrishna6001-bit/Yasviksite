import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SeznikPrintPanel from '@/components/admin/SeznikPrintPanel';
import A4EpsonPrintPanel from '@/components/admin/A4EpsonPrintPanel';
import A4LegacyPrintPanel from '@/components/admin/A4LegacyPrintPanel';
import LabelTemplateBuilder from '@/components/admin/LabelTemplateBuilder';

const MODES = [
  { id: 'a4-epson', label: 'A4 Epson Print' },
  { id: 'builder', label: 'Template Builder' },
  { id: 'a4', label: 'A4 legacy (no QR)' },
  { id: 'seznik', label: 'Seznik roll (legacy)' },
];

export default function AdminLabelGenerator() {
  const [mode, setMode] = useState('a4-epson');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Price Label Generator"
        description="Batch labels with smart search, pack picker, and inline product edit — across Epson, Seznik, and legacy A4."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`rounded-full px-4 py-2 font-inter text-sm transition-colors ${
              mode === item.id
                ? 'bg-forest-canopy text-white'
                : 'border border-border text-rain-cloud/70 hover:bg-rain-mist'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'a4-epson' ? (
        <A4EpsonPrintPanel onOpenTemplateBuilder={() => setMode('builder')} />
      ) : mode === 'seznik' ? (
        <SeznikPrintPanel onOpenTemplateBuilder={() => setMode('builder')} />
      ) : mode === 'builder' ? (
        <LabelTemplateBuilder onTemplateSaved={() => setMode('a4-epson')} />
      ) : (
        <A4LegacyPrintPanel />
      )}
    </div>
  );
}
