import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCatalogueTabs from '@/components/admin/AdminCatalogueTabs';
import SeznikPrintPanel from '@/components/admin/SeznikPrintPanel';
import A4EpsonPrintPanel from '@/components/admin/A4EpsonPrintPanel';
import A4LegacyPrintPanel from '@/components/admin/A4LegacyPrintPanel';
import LabelTemplateBuilder from '@/components/admin/LabelTemplateBuilder';

const ADVANCED_MODES = [
  { id: 'builder', label: 'Template Builder' },
  { id: 'a4-epson', label: 'A4 Epson (QR)' },
  { id: 'a4', label: 'A4 legacy (no QR)' },
];

const WIZARD_STEPS = [
  { id: 1, label: 'Add products' },
  { id: 2, label: 'Review & print' },
];

export default function AdminLabelGenerator() {
  const [searchParams] = useSearchParams();
  const deepLinkProductId = searchParams.get('product') || '';

  const [wizardStep, setWizardStep] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState('builder');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminCatalogueTabs />
      <AdminPageHeader
        title="Print shelf labels"
        description="Seznik roll labels by default — add products, review prices, then print."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {WIZARD_STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setWizardStep(step.id)}
            className={`rounded-full px-4 py-2 font-inter text-sm transition-colors ${
              wizardStep === step.id
                ? 'bg-forest-canopy text-white'
                : 'border border-border text-rain-cloud/70 hover:bg-rain-mist'
            }`}
          >
            {step.id}. {step.label}
          </button>
        ))}
      </div>

      <SeznikPrintPanel
        onOpenTemplateBuilder={() => { setAdvancedOpen(true); setAdvancedMode('builder'); }}
        initialProductId={deepLinkProductId}
        onQueueReady={() => setWizardStep(2)}
        reviewMode={wizardStep === 2}
      />

      <div className="mt-8 rounded-2xl border border-border/50 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-rain-mist/30"
        >
          <span className="font-inter text-sm text-rain-cloud/60">Other print modes</span>
          {advancedOpen ? <ChevronUp className="w-4 h-4 text-rain-cloud/40" /> : <ChevronDown className="w-4 h-4 text-rain-cloud/40" />}
        </button>
        {advancedOpen ? (
          <div className="border-t border-border/40 p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {ADVANCED_MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAdvancedMode(item.id)}
                  className={`rounded-full px-4 py-2 font-inter text-sm transition-colors ${
                    advancedMode === item.id
                      ? 'bg-wet-earth text-white'
                      : 'border border-border text-rain-cloud/70 hover:bg-rain-mist'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {advancedMode === 'a4-epson' ? (
              <A4EpsonPrintPanel onOpenTemplateBuilder={() => setAdvancedMode('builder')} />
            ) : advancedMode === 'builder' ? (
              <LabelTemplateBuilder onTemplateSaved={() => setAdvancedMode('a4-epson')} />
            ) : (
              <A4LegacyPrintPanel />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
