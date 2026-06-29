import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { products } from '@/services/api';
import ProductFormDrawer from '@/components/admin/ProductFormDrawer';
import {
  PRODUCT_EDITOR_EMPTY,
  buildProductSavePayload,
  productToEditorForm,
} from '@/lib/adminProductFormUtils';
import { invalidatePublicProductQueries } from '@/lib/productQueryInvalidation';

export function useInlineProductEditor({ onSaved } = {}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(PRODUCT_EDITOR_EMPTY);

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => products.update(id, d),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-label-products'] });
      invalidatePublicProductQueries(qc);
      onSaved?.(id);
      close();
    },
    onError: (err) => {
      alert(err?.message || 'Failed to update product');
    },
  });

  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm(PRODUCT_EDITOR_EMPTY);
  };

  const openProductEditor = (product) => {
    if (!product?.id) return;
    setEditing(product);
    setForm(productToEditorForm(product));
    setOpen(true);
  };

  const handleSave = () => {
    if (!editing?.id) return;
    updateMut.mutate({
      id: editing.id,
      d: buildProductSavePayload(form),
    });
  };

  const productEditorDrawer = (
    <ProductFormDrawer
      open={open}
      onClose={close}
      data={form}
      onChange={setForm}
      onSave={handleSave}
      isSaving={updateMut.isPending}
      isEditing
    />
  );

  return { openProductEditor, productEditorDrawer };
}
