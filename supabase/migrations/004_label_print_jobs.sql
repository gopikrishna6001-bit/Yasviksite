-- Yasvik label print job tracking (Seznik thermal roll workflow)

CREATE TABLE IF NOT EXISTS label_print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  print_job_no VARCHAR(32) NOT NULL UNIQUE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id TEXT,
  product_name_en VARCHAR(255),
  product_name_te VARCHAR(255),
  weight VARCHAR(64),
  mrp DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  packed_date DATE NOT NULL,
  batch_no VARCHAR(32) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'generated'
);

CREATE TABLE IF NOT EXISTS label_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  print_job_id UUID NOT NULL REFERENCES label_print_jobs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id TEXT,
  batch_no VARCHAR(32) NOT NULL,
  serial_no VARCHAR(8) NOT NULL,
  barcode_value VARCHAR(64) NOT NULL,
  printed_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  inventory_deducted_at TIMESTAMPTZ,
  status VARCHAR(32) DEFAULT 'generated'
);

CREATE INDEX IF NOT EXISTS idx_label_print_jobs_batch ON label_print_jobs(batch_no);
CREATE INDEX IF NOT EXISTS idx_label_print_jobs_generated_at ON label_print_jobs(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_label_print_jobs_product ON label_print_jobs(product_id);
CREATE INDEX IF NOT EXISTS idx_label_items_print_job ON label_items(print_job_id);
CREATE INDEX IF NOT EXISTS idx_label_items_barcode ON label_items(barcode_value);
CREATE UNIQUE INDEX IF NOT EXISTS idx_label_items_job_serial ON label_items(print_job_id, serial_no);

ALTER TABLE label_print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read label print jobs"
ON label_print_jobs FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Admins can insert label print jobs"
ON label_print_jobs FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Admins can update label print jobs"
ON label_print_jobs FOR UPDATE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Admins can delete label print jobs"
ON label_print_jobs FOR DELETE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Admins can read label items"
ON label_items FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Admins can insert label items"
ON label_items FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Admins can update label items"
ON label_items FOR UPDATE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Admins can delete label items"
ON label_items FOR DELETE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));
