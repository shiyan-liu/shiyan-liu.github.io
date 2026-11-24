import {cfg} from './space-session';

export type AnniversaryPhoto = {
  number: number;
  takenAt: string;
  caption: string;
  alt: string;
  ratio: number;
  bytes: number;
};

export type AnniversaryScene = {
  chapter: string;
  title: string;
  bridge: string;
  photos: AnniversaryPhoto[];
  url: string;
};

export type AnniversaryAlbum = {
  scenes: AnniversaryScene[];
  images: (index: number) => Promise<string[]>;
  dispose: () => void;
};

const passSlot = 'zz-anniversary-album';
const passPattern = /^([a-f0-9]{64})\.([A-Za-z0-9_-]{20,1200})$/;
const bucketPath = '/storage/v1/object/sign/anniversary-archive/';

export function captureAnniversaryPass() {
  const match = /^#album=(.*)$/.exec(location.hash);
  if (match) {
    if (!passPattern.test(match[1])) return '';
    sessionStorage.setItem(passSlot, match[1]);
    history.replaceState(history.state, '', location.pathname + location.search);
    return match[1];
  }
  return sessionStorage.getItem(passSlot) ?? '';
}

function signedObject(value: string, object: RegExp) {
  const url = new URL(value);
  if (!cfg || url.origin !== new URL(cfg.supabaseUrl).origin || !url.searchParams.has('token') ||
    !url.pathname.startsWith(bucketPath) || !object.test(url.pathname.slice(bucketPath.length))) {
    throw new Error('Invalid album object');
  }
  return url;
}

async function openObject(url: URL, key: CryptoKey) {
  const response = await fetch(url, {referrerPolicy: 'no-referrer', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Album object unavailable');
  const sealed = new Uint8Array(await response.arrayBuffer());
  return crypto.subtle.decrypt({name: 'AES-GCM', iv: sealed.subarray(0, 12)}, key, sealed.subarray(12));
}

export async function loadAnniversaryAlbum(pass: string): Promise<AnniversaryAlbum> {
  const match = passPattern.exec(pass);
  if (!match) throw new Error('Invalid album pass');
  const manifestUrl = signedObject(atob(match[2].replace(/-/g, '+').replace(/_/g, '/')), /^[a-f0-9]{24}\/album\.bin$/);
  const keyBytes = Uint8Array.from(match[1].match(/../g)!, hex => Number.parseInt(hex, 16));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const manifest = JSON.parse(new TextDecoder().decode(await openObject(manifestUrl, key)));
  const scenes = manifest.scenes as AnniversaryScene[];
  if (manifest.version !== 1 || !Array.isArray(scenes) || !scenes.length) throw new Error('Empty album');
  const basePath = manifestUrl.pathname.replace(/album\.bin$/, '');
  const urls = scenes.map((scene, index) => {
    const url = signedObject(scene.url, /^[a-f0-9]{24}\/scene-\d{3}\.bin$/);
    if (url.pathname !== basePath + `scene-${String(index + 1).padStart(3, '0')}.bin` ||
      !Array.isArray(scene.photos) || !scene.photos.length) throw new Error('Invalid album scene');
    return url;
  });
  const cached = new Map<number, Promise<string[]>>();
  const objectUrls = new Set<string>();
  let disposed = false;

  function images(index: number) {
    const saved = cached.get(index);
    if (saved) return saved;
    const loading = openObject(urls[index], key).then(async bytes => {
      if (disposed) throw new Error('Album closed');
      const photos = scenes[index].photos;
      const lengths = photos.map(photo => photo.bytes);
      if (lengths.some(length => !Number.isSafeInteger(length) || length <= 0) ||
        lengths.reduce((sum, length) => sum + length, 0) !== bytes.byteLength) throw new Error('Incomplete scene');
      let position = 0;
      const created = lengths.map(length => {
        const url = URL.createObjectURL(new Blob([bytes.slice(position, position + length)], {type: 'image/webp'}));
        position += length;
        objectUrls.add(url);
        return url;
      });
      try {
        await Promise.all(created.map(url => {
          const image = new Image();
          image.src = url;
          return image.decode();
        }));
        return created;
      } catch (error) {
        created.forEach(url => { URL.revokeObjectURL(url); objectUrls.delete(url); });
        throw error;
      }
    }).catch(error => { cached.delete(index); throw error; });
    cached.set(index, loading);
    return loading;
  }

  return {scenes, images, dispose() {
    disposed = true;
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
    cached.clear();
  }};
}
