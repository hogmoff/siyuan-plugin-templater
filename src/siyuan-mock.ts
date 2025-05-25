// Mock for the 'siyuan' module, specifically for ts-node execution.
// This will attempt a real fetch to a local Siyuan instance.

// Ensure fetch is available in the global scope for Node.js
if (typeof fetch === 'undefined' && typeof window === 'undefined') {
  // Node 18+ has global fetch.
}

export async function fetchPOST(url: string, data: any, cb?: (response: any) => void, headers?: any) {
  const fullUrl = `http://127.0.0.1:6806${url.startsWith('/') ? url : '/' + url}`;
  console.log(`[siyuan-mock] fetchPOST: ${fullUrl} with data:`, data);
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: JSON.stringify(data),
    });
    const jsonResponse = await response.json();
    if (cb) {
      cb(jsonResponse);
    }
    return jsonResponse;
  } catch (error) {
    console.error(`[siyuan-mock] fetchPOST error to ${fullUrl}:`, error);
    throw error; 
  }
}

export async function fetchSyncPost(url: string, data: any, cb?: (response: any) => void) {
  // This is harder to make truly synchronous in Node without special libraries or a more complex setup.
  // For the purpose of testing setIcon, which uses fetchPOST (async), this might not be critical.
  console.warn("[siyuan-mock] fetchSyncPost is not truly synchronous in this mock and will behave like fetchPOST.");
  return fetchPOST(url, data, cb); // Delegate to async version for this mock
}

export function getFrontend() {
  return "Desktop"; 
}

export function getBackend() {
  return "windows";
}

export class Dialog { constructor(options: any) {} destroy() {} }
export class Menu { constructor(options:any) {} destroy() {} }
export const confirm = (title: string, text: string, cb?: ()=> void) => { if (cb) cb(); };
export const Constants = {
    SIYUAN_VERSION: "mock-version",
    KERNEL_VERSION: "mock-kernel-version",
};
export const 交易类型: any[] = []; // Assuming this is an empty array or enum-like structure
export const unicodeDecorate = (s: string, unicode:string, space:boolean=false) => s;
export const unicodeFragment = (s: string, unicode:string) => s;
export class Plugin {};
export class Protyle {};
export class Setting {};
export const showMessage = (msg: string, timeout?: number, type?: string, id?:string ) => {};
export class ILSV {};

export interface IObject { [key: string]: any; }
