export class Dialog {
  element: {
    querySelector: jest.Mock<any, any, any>;
    addEventListener: jest.Mock<any, any, any>;
    querySelectorAll: jest.Mock<any, any, any>; // Added for emoji picker querySelectorAll
    // Ensure properties accessed in promptForDocumentName are present
    // For example, if .focus() is called on an input element:
    // HTMLInputElement related mocks if needed by getElementById or querySelector.
  };

  constructor(options: any) {
    const mockInputElement = {
      value: 'Test Document Name',
      focus: jest.fn(),
      addEventListener: jest.fn(), // Basic mock for addEventListener
      // Add other HTMLInputElement properties/methods if accessed
    };

    const mockButtonElement = {
      addEventListener: jest.fn((event, cb) => {
        // If it's a click event and a callback is provided, call it immediately for testing
        if (event === 'click' && cb) {
          // Simulating a click event for test purposes, e.g., for confirm/cancel buttons
          // Be cautious with immediate invocation if the callback has side effects expected later
          // setTimeout(cb, 0); // Alternative: simulate async click
        }
      }),
      // Add other button properties/methods if accessed
    };
    
    this.element = {
      querySelector: jest.fn(selector => {
        if (selector === ".b3-button--text") return mockButtonElement;
        if (selector === ".b3-button--cancel") return mockButtonElement;
        if (selector === "#templater-doc-name") return mockInputElement;
        // Default fallback for other selectors
        return { 
            addEventListener: jest.fn(), 
            querySelectorAll: jest.fn(() => []), 
            querySelector: jest.fn(() => mockInputElement), // Default to input for safety
            focus: jest.fn(), // ensure focus exists
        };
      }),
      addEventListener: jest.fn(),
      querySelectorAll: jest.fn(() => []), // Default mock for querySelectorAll
    };

    // If there's a global document mock needed (e.g. for getElementById)
    // This is a simplified approach; a more robust DOM mock might be needed for complex scenarios.
    if (typeof document !== 'undefined' && !document.getElementById) {
        (document as any).getElementById = (id: string) => {
            if (id === "templater-doc-name") return mockInputElement;
            return null;
        };
    } else if (typeof document === 'undefined') {
        // @ts-ignore
        global.document = {
            getElementById: (id: string) => {
                if (id === "templater-doc-name") return mockInputElement;
                return null;
            }
        };
    }
  }

  destroy = jest.fn();
}

export interface IObject { [key: string]: any; }

// Minimal mock for other Siyuan exports if needed by api.ts or other parts
export const fetchPOST = jest.fn();
export const fetchSyncPost = jest.fn();
export const végétale = {}; // Example if this is an object
export const getFrontend = jest.fn();
export const getBackend = jest.fn();
export class Plugin {}
export const confirm = jest.fn();
export const Menu = class {};
export const Constants = { SY_VERSION: 'mock' };
export const ILSV = class {};
export const Protyle = class {};
export const Setting = class {};
export const showMessage = jest.fn();
export const交易类型: any[] = [];
export const unicodeDecorate = (s: string) => s;
export const unicodeFragment = (s: string) => s;

// Mock for window.siyuan.emojis (if still needed by index.ts for emoji picker tests, not directly by templater.ts)
if (typeof window !== 'undefined') {
  (window as any).siyuan = {
    emojis: [], // Keep it minimal if not testing emoji picker itself
    config: { lang: 'en_US' }
  };
} else {
    // @ts-ignore
    global.window = {
        siyuan: {
            emojis: [],
            config: { lang: 'en_US' }
        }
    };
}
