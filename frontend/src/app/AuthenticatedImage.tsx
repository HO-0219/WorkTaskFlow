import { useEffect, useState } from 'react';
import { accessToken } from '../api/client';

export function AuthenticatedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let createdUrl = '';
    const resolved = new URL(src, window.location.origin);
    if (resolved.origin !== window.location.origin || !resolved.pathname.startsWith('/uploads/')) return;
    const token = accessToken.get();
    fetch(resolved.toString(), {
      signal: controller.signal,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((response) => {
      if (!response.ok) throw new Error('image');
      return response.blob();
    }).then((blob) => {
      createdUrl = URL.createObjectURL(blob);
      setObjectUrl(createdUrl);
    }).catch(() => undefined);
    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  return objectUrl ? <img src={objectUrl} alt={alt} className={className} /> : null;
}
