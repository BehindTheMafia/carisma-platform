-- Create storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehiculo-fotos', 'vehiculo-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload vehiculo-fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehiculo-fotos');

-- Allow authenticated users to view
CREATE POLICY "Authenticated view vehiculo-fotos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehiculo-fotos');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated delete vehiculo-fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehiculo-fotos');
