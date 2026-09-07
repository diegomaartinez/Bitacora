import { DRIVE_ROOT_FOLDER_NAME } from './config.js';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const blobUrlCache = new Map();

function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function driveFetch(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: authHeaders(token, options.headers || {}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status}: ${body || res.statusText}`);
  }
  return res;
}

function escapeForQuery(value) {
  return value.replace(/'/g, "\\'");
}

/** Busca la carpeta raiz visible "Bitácora"; la crea si no existe. */
export async function ensureRootFolder(token) {
  const q = encodeURIComponent(
    `name='${escapeForQuery(DRIVE_ROOT_FOLDER_NAME)}' and mimeType='${FOLDER_MIME}' and trashed=false and 'root' in parents`
  );
  const res = await driveFetch(token, `${API}/files?q=${q}&fields=files(id,name)`);
  const data = await res.json();
  if (data.files && data.files.length > 0) return data.files[0].id;

  const createRes = await driveFetch(token, `${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_ROOT_FOLDER_NAME, mimeType: FOLDER_MIME, parents: ['root'] }),
  });
  const created = await createRes.json();
  return created.id;
}

/** Lista los viajes (subcarpetas) dentro de la carpeta raiz. */
export async function listTrips(token, rootFolderId) {
  const q = encodeURIComponent(
    `'${rootFolderId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`
  );
  const res = await driveFetch(
    token,
    `${API}/files?q=${q}&fields=files(id,name,createdTime)&orderBy=createdTime desc`
  );
  const data = await res.json();
  return data.files || [];
}

async function createFolder(token, name, parentId) {
  const res = await driveFetch(token, `${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  const data = await res.json();
  return data.id;
}

function multipartBody(metadata, content, contentType) {
  const boundary = `travel_diary_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  if (typeof content === 'string') {
    const body =
      delimiter + metaPart + delimiter + `Content-Type: ${contentType}\r\n\r\n` + content + closeDelimiter;
    return { body, boundary };
  }
  return { boundary, metaPart, delimiter, closeDelimiter, contentType };
}

async function uploadJsonFile(token, name, parentId, dataObject) {
  const metadata = { name, parents: [parentId], mimeType: 'application/json' };
  const { body, boundary } = multipartBody(metadata, JSON.stringify(dataObject), 'application/json');
  const res = await driveFetch(
    token,
    `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  return res.json();
}

async function findTripJsonFileId(token, tripFolderId) {
  const q = encodeURIComponent(`'${tripFolderId}' in parents and name='trip.json' and trashed=false`);
  const res = await driveFetch(token, `${API}/files?q=${q}&fields=files(id)`);
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/** Crea un viaje nuevo: carpeta + trip.json inicial. Devuelve {folderId, data}. */
export async function createTrip(token, rootFolderId, tripInfo) {
  const folderId = await createFolder(token, tripInfo.name, rootFolderId);
  const data = {
    name: tripInfo.name,
    query: tripInfo.query || tripInfo.name,
    center: { lat: tripInfo.lat, lng: tripInfo.lng },
    zoom: tripInfo.zoom || 8,
    places: [],
    createdAt: new Date().toISOString(),
  };
  await uploadJsonFile(token, 'trip.json', folderId, data);
  return { folderId, data };
}

/** Lee el trip.json de un viaje. */
export async function getTripData(token, tripFolderId) {
  const fileId = await findTripJsonFileId(token, tripFolderId);
  if (!fileId) return null;
  const res = await driveFetch(token, `${API}/files/${fileId}?alt=media`);
  return res.json();
}

/** Sobrescribe el trip.json de un viaje (crea o actualiza segun exista). */
export async function saveTripData(token, tripFolderId, data) {
  const fileId = await findTripJsonFileId(token, tripFolderId);
  if (!fileId) {
    await uploadJsonFile(token, 'trip.json', tripFolderId, data);
    return;
  }
  await driveFetch(token, `${UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/** Crea (si hace falta) la subcarpeta de fotos de un lugar dentro del viaje. */
export async function ensurePlaceFolder(token, tripFolderId, placeName) {
  return createFolder(token, placeName, tripFolderId);
}

/** Sube una foto (File del input) a la carpeta de un lugar. */
export async function uploadPhoto(token, placeFolderId, file) {
  const metadata = { name: file.name, parents: [placeFolderId] };
  const boundary = `travel_diary_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}\r\n`;
  const mediaHeader = `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;

  const fileBuffer = await file.arrayBuffer();
  const encoder = new TextEncoder();
  const parts = [encoder.encode(metaPart), encoder.encode(mediaHeader), new Uint8Array(fileBuffer), encoder.encode(closing)];
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.length;
  }

  const res = await driveFetch(
    token,
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,thumbnailLink,mimeType`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  return res.json();
}

/** Lista las fotos (archivos de imagen) dentro de la carpeta de un lugar. */
export async function listPhotos(token, placeFolderId) {
  const q = encodeURIComponent(`'${placeFolderId}' in parents and trashed=false and mimeType contains 'image/'`);
  const res = await driveFetch(
    token,
    `${API}/files?q=${q}&fields=files(id,name,thumbnailLink,createdTime)&orderBy=createdTime desc`
  );
  const data = await res.json();
  return data.files || [];
}

/**
 * Lista todas las fotos de un viaje, de todos sus lugares, en un solo
 * array plano (cada foto lleva ademas el nombre y la fecha del lugar al
 * que pertenece). Se usa para la galeria general del viaje.
 */
export async function listTripPhotos(token, places) {
  const perPlace = await Promise.all(
    places.map(async (place) => {
      try {
        const photos = await listPhotos(token, place.id);
        return photos.map((photo) => ({
          ...photo,
          placeId: place.id,
          placeName: place.name,
          placeDate: place.date || null,
        }));
      } catch (err) {
        return [];
      }
    })
  );
  return perPlace
    .flat()
    .sort((a, b) => (a.placeDate || '').localeCompare(b.placeDate || '') || a.createdTime.localeCompare(b.createdTime));
}

/** Descarga el contenido de una foto y devuelve una object URL (con cache en memoria). */
export async function getPhotoBlobUrl(token, fileId) {
  if (blobUrlCache.has(fileId)) return blobUrlCache.get(fileId);
  const res = await driveFetch(token, `${API}/files/${fileId}?alt=media`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(fileId, url);
  return url;
}

/** Elimina una foto de Drive (la mueve a la papelera). */
export async function deletePhoto(token, fileId) {
  await driveFetch(token, `${API}/files/${fileId}`, { method: 'DELETE' });
  if (blobUrlCache.has(fileId)) {
    URL.revokeObjectURL(blobUrlCache.get(fileId));
    blobUrlCache.delete(fileId);
  }
}

/**
 * Convierte la carpeta de un viaje en "cualquiera con el enlace puede ver"
 * (solo lectura) y devuelve el enlace publico a esa carpeta.
 *
 * Importante: esto solo afecta a la carpeta de ESTE viaje (y a lo que
 * contiene: sus lugares y fotos). No concede acceso ni al resto del Drive
 * del usuario ni a otros viajes, y el rol "reader" impide que quien reciba
 * el enlace pueda editar o borrar nada.
 */
export async function ensureTripShareLink(token, tripFolderId) {
  const res = await driveFetch(
    token,
    `${API}/files/${tripFolderId}/permissions?fields=permissions(id,type,role)`
  );
  const data = await res.json();
  const alreadyPublic = (data.permissions || []).some(
    (p) => p.type === 'anyone' && p.role === 'reader'
  );
  if (!alreadyPublic) {
    await driveFetch(token, `${API}/files/${tripFolderId}/permissions?sendNotificationEmail=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'anyone', role: 'reader', allowFileDiscovery: false }),
    });
  }
  return `https://drive.google.com/drive/folders/${tripFolderId}`;
}

/** Revoca el acceso publico ("cualquiera con el enlace") a la carpeta de un viaje. */
export async function revokeTripShareLink(token, tripFolderId) {
  const res = await driveFetch(
    token,
    `${API}/files/${tripFolderId}/permissions?fields=permissions(id,type,role)`
  );
  const data = await res.json();
  const publicPerms = (data.permissions || []).filter((p) => p.type === 'anyone');
  await Promise.all(
    publicPerms.map((p) =>
      driveFetch(token, `${API}/files/${tripFolderId}/permissions/${p.id}`, { method: 'DELETE' })
    )
  );
}
