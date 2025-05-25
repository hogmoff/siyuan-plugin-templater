export class Dialog {
  element: {
    querySelector: jest.Mock<any, any>;
    addEventListener: jest.Mock<any, any>;
    querySelectorAll: jest.Mock<any,any>; // Added for emoji picker querySelectorAll
  };
  constructor(options: any) {
    this.element = {
      querySelector: jest.fn(selector => {
        if (selector === ".b3-button--text") {
          // Mock confirm button for promptForDocumentName
          const mockConfirmBtn = { addEventListener: jest.fn((event, cb) => { if(event === 'click') setTimeout(cb,0); }) };
          return mockConfirmBtn;
        }
        if (selector === ".b3-button--cancel") {
          // Mock cancel button for promptForDocumentName
          const mockCancelBtn = { addEventListener: jest.fn((event, cb) => { if(event === 'click') setTimeout(cb,0); }) };
          return mockCancelBtn;
        }
        if (selector === "#templater-doc-name") {
          // Mock input for promptForDocumentName
          return { value: 'Test Document Name', focus: jest.fn() };
        }
        return { addEventListener: jest.fn(), querySelectorAll: jest.fn(() => []) }; // Default mock
      }),
      addEventListener: jest.fn(),
      querySelectorAll: jest.fn(() => []), // Default mock for querySelectorAll
    };
    // Automatically call the confirm action for promptForDocumentName if that's what's being created.
    // This simplifies testing applyTemplate when no destinationPath is given.
    if (options && options.content && options.content.includes("templater-doc-name")) {
        const confirmButtonMock = this.element.querySelector(".b3-button--text");
        if (confirmButtonMock && confirmButtonMock.addEventListener.mock.calls.length > 0) {
            // Assuming the click listener is the first one added for the confirm button
            // confirmButtonMock.addEventListener.mock.calls[0][1](); // Call the click listener
        }
    }
  }
  destroy = jest.fn();
}

export interface IObject { [key: string]: any; }

// Mock for window.siyuan.emojis if needed by other parts of Siyuan module, though not directly by templater.ts
if (typeof window !== 'undefined') {
  (window as any).siyuan = {
    emojis: [ // Basic mock structure
      {
        id: 'people',
        title: 'People',
        items: [{ unicode: '1F600', description: 'grinning face', keywords: ['face', 'grin'] }]
      }
    ],
    config: {
        lang: 'en_US' // mock lang
    }
  };
}
