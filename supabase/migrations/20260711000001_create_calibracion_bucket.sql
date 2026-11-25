-- Create storage bucket for calibration form scans
INSERT INTO storage.buckets (id, name, public)
VALUES ('formularios-calibracion', 'formularios-calibracion', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload formularios-calibracion"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'formularios-calibracion');

-- Allow authenticated users to view
CREATE POLICY "Authenticated view formularios-calibracion"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'formularios-calibracion');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated delete formularios-calibracion"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'formularios-calibracion');
