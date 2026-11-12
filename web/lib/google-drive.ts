"use client";

/**
 * Importação do Google Drive feita só no navegador: o seletor do Google dá acesso
 * apenas aos arquivos que a pessoa escolher (escopo drive.file), e o token vive só
 * nesta aba. O NossaFoto não guarda nenhuma credencial do Drive.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const IMAGE_TYPES = "image/jpeg,image/png,image/webp";

export const driveConfigured = Boolean(CLIENT_ID && API_KEY && APP_ID);

export type DriveFile = { id: string; name: string; mimeType: string; size: number; sha256: string | null };

export class DriveAuthError extends Error {}

/* eslint-disable @typescript-eslint/no-explicit-any */
type G = any;
const w = () => window as unknown as { google?: G; gapi?: G };

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Não foi possível carregar o Google. Verifique a conexão e tente de novo."));
    document.head.appendChild(el);
  });
}

async function ready() {
  await Promise.all([loadScript("https://accounts.google.com/gsi/client"), loadScript("https://apis.google.com/js/api.js")]);
  if (!w().google?.picker) await new Promise<void>((resolve) => w().gapi.load("picker", () => resolve()));
}

function requestToken() {
  return new Promise<string>((resolve, reject) => {
    const client = w().google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (res: G) => (res?.access_token ? resolve(res.access_token) : reject(new DriveAuthError("O Google não liberou o acesso."))),
      error_callback: () => reject(new DriveAuthError("A janela do Google foi fechada antes de liberar o acesso.")),
    });
    client.requestAccessToken();
  });
}

function pick(token: string) {
  return new Promise<{ id: string; name: string; mimeType: string; size: number }[]>((resolve) => {
    const { picker } = w().google;
    const view = new picker.DocsView(picker.ViewId.DOCS).setMimeTypes(IMAGE_TYPES).setIncludeFolders(true).setMode(picker.DocsViewMode.GRID);
    const shared = new picker.DocsView(picker.ViewId.DOCS).setMimeTypes(IMAGE_TYPES).setIncludeFolders(true).setEnableDrives(true);
    new picker.PickerBuilder()
      .addView(view)
      .addView(shared)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(picker.Feature.SUPPORT_DRIVES)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setLocale("pt-BR")
      .setTitle("Escolha as fotos")
      .setCallback((data: G) => {
        if (data.action === picker.Action.PICKED) {
          resolve(
            (data.docs as G[])
              .filter((d) => IMAGE_TYPES.includes(d.mimeType))
              .map((d) => ({ id: d.id, name: d.name, mimeType: d.mimeType, size: Number(d.sizeBytes ?? 0) })),
          );
        } else if (data.action === picker.Action.CANCEL) resolve([]);
      })
      .build()
      .setVisible(true);
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function driveFetch(token: string, path: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new DriveAuthError("O acesso ao Google expirou. Clique em importar de novo: o que já entrou não é enviado outra vez.");
  if (!res.ok) throw new Error(`O Google Drive respondeu ${res.status}.`);
  return res;
}

/** Abre o login e o seletor do Google. Devolve o token desta sessão e os arquivos escolhidos. */
export async function chooseFromDrive() {
  await ready();
  const token = await requestToken();
  return { token, files: await pick(token) };
}

/** Tamanho e SHA-256 que o próprio Drive guarda: permite pular repetidas sem baixar. */
export async function driveMetadata(token: string, id: string, fallback: { name: string; mimeType: string; size: number }): Promise<DriveFile> {
  const res = await driveFetch(token, `${encodeURIComponent(id)}?fields=id,name,mimeType,size,sha256Checksum&supportsAllDrives=true`);
  const m = (await res.json()) as { name?: string; mimeType?: string; size?: string; sha256Checksum?: string };
  return {
    id,
    name: m.name ?? fallback.name,
    mimeType: m.mimeType ?? fallback.mimeType,
    size: Number(m.size ?? fallback.size),
    sha256: m.sha256Checksum && /^[0-9a-f]{64}$/i.test(m.sha256Checksum) ? m.sha256Checksum.toLowerCase() : null,
  };
}

export async function driveDownload(token: string, id: string) {
  const res = await driveFetch(token, `${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`);
  return res.blob();
}
