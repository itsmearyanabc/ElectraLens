-- ElectraLens 0011: storage buckets (B06.11, Architecture §5.5).
-- No storage policies are created for anon or authenticated, so they can't list, read or write
-- objects through the storage API. Uploads use short-lived signed URLs issued by the API;
-- restricted reads use 5-minute signed URLs; public-artifacts is a public bucket for
-- published files only, written by the service role. 50 MB is the free plan's file limit.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('quarantine', 'quarantine', false, 52428800,
   array['text/csv', 'application/vnd.apache.parquet', 'application/octet-stream']),
  ('datasets-restricted', 'datasets-restricted', false, 52428800, null),
  ('public-artifacts', 'public-artifacts', true, 52428800,
   array['application/json', 'application/x-ndjson', 'application/gzip', 'text/csv', 'application/octet-stream'])
on conflict (id) do nothing;
