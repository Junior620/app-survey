-- Allow common attachment MIME types (Android often reports text/plain for local files).
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/octet-stream'
]
where id = 'attachments';
