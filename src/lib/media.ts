import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export async function uploadMedia(file: File, userId: string, bucket = 'chat-media') {
  const limit = bucket === 'avatars' ? 5 : bucket === 'backgrounds' ? 10 : 50;
  if (file.size > limit * 1024 * 1024) throw new Error(`File must be under ${limit} MB`);
  if (!/^(image|audio|video)\//.test(file.type)) throw new Error('Choose an image, audio or video file');
  const ext = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw new Error('Upload failed. Please try again.');
  return `storage:${bucket}:${path}`;
}
export function useMediaUrl(value: string | null | undefined) {
  return useQuery({ queryKey: ['media-url', value], enabled: !!value, staleTime: 40 * 60_000, refetchInterval: 40 * 60_000, queryFn: async () => {
    if (!value) return null;
    if (!value.startsWith('storage:')) return value;
    const [, bucket, path] = value.split(':');
    if (!bucket || !path) return null;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (error) throw new Error('Could not load this file');
    return data.signedUrl;
  }});
}
