import * as templaterMod from './templater'; // Import all exports for spying
import * as api from './api'; // Import to allow spying/mocking individual functions

// Destructure needed functions from templaterMod for direct use in tests if desired
const { getCurrentDateString, getCurrentWeekNumber, Templater, generateDateIconSVG, generateWeekIconSVG } = templaterMod;


// Mock the entire api module
jest.mock('./api', () => ({
  getFile: jest.fn().mockResolvedValue([]), // Ensure loadRules doesn't try to saveRules
  getWorkspaceDir: jest.fn().mockResolvedValue('/mock/workspace'),
  getNotebookIdByDocId: jest.fn().mockResolvedValue('mockNotebookId'),
  createDocWithMd: jest.fn().mockResolvedValue('mockNewPathDocId'),
  renameDocbyId: jest.fn().mockResolvedValue({ code: 0 }),
  moveDocbyId: jest.fn().mockResolvedValue({ code: 0 }),
  getHPathByID: jest.fn().mockResolvedValue({ data: '/mock/hpath' }),
  getIDsByHPath: jest.fn().mockResolvedValue(['mockExistingPathDocId']),
  renderTemplate: jest.fn().mockResolvedValue({ content: 'mock template content' }),
  setIcon: jest.fn().mockResolvedValue({ code: 0 }),
  getChildBlocks: jest.fn().mockResolvedValue({ data: [{ id: 'mockFirstBlockId' }] }),
  insertBlock: jest.fn().mockResolvedValue({ code: 0, data: [{ id: 'mockInsertedBlockId' }] }),
  deleteBlock: jest.fn().mockResolvedValue({ code: 0 }),
  renderSprig: jest.fn().mockImplementation(path => Promise.resolve(path)), // Simple pass-through for sprig
}));

// Spy on setIcon to check its arguments later
const setIconSpy = jest.spyOn(api, 'setIcon');
let generateDateIconSVGSpy: jest.SpyInstance;
let generateWeekIconSVGSpy: jest.SpyInstance;
let getCurrentDateStringSpy: jest.SpyInstance;
let getCurrentWeekNumberSpy: jest.SpyInstance;


describe('Templater Utility Functions', () => {
  describe('getCurrentDateString', () => {
    it('should return a string', () => {
      expect(typeof templaterMod.getCurrentDateString()).toBe('string');
    });

    it('should return a string of length 1 or 2', () => {
      const dateStr = templaterMod.getCurrentDateString();
      expect(dateStr.length).toBeGreaterThanOrEqual(1);
      expect(dateStr.length).toBeLessThanOrEqual(2);
    });

    it('should return a valid day format (D or DD)', () => {
      const dateStr = templaterMod.getCurrentDateString();
      const dateNum = parseInt(dateStr, 10);
      expect(dateNum).toBeGreaterThanOrEqual(1);
      expect(dateNum).toBeLessThanOrEqual(31);
      if (dateStr.length === 2) {
        expect(['0', '1', '2', '3']).toContain(dateStr[0]);
      }
    });
  });

  describe('getCurrentWeekNumber', () => {
    it('should return a string', () => {
      expect(typeof templaterMod.getCurrentWeekNumber()).toBe('string');
    });

    it('should be parseable to a number', () => {
      const weekStr = templaterMod.getCurrentWeekNumber();
      expect(() => parseInt(weekStr, 10)).not.toThrow();
    });

    it('should be a number between 1 and 53', () => {
      const weekStr = templaterMod.getCurrentWeekNumber();
      const weekNum = parseInt(weekStr, 10);
      expect(weekNum).toBeGreaterThanOrEqual(1);
      expect(weekNum).toBeLessThanOrEqual(53);
    });
  });
});

describe('Templater Class', () => {
  let templater: templaterMod.Templater; // Use module alias for type annotation

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Provide a dummy i18n object for constructor
    const mockI18n = {
        newDocument: "New Document",
        enterDocName: "Enter document name",
        cancel: "Cancel",
        confirm: "Confirm",
        // Add any other i18n keys used by Templater constructor or methods if necessary
    };
    templater = new Templater('test-plugin-id', mockI18n);
    // Mock loadRules to prevent file system access during tests for applyTemplate
    jest.spyOn(templater, 'loadRules').mockImplementation(() => Promise.resolve());

    // Spy on the actual SVG generation functions
    generateDateIconSVGSpy = jest.spyOn(templaterMod, 'generateDateIconSVG');
    generateWeekIconSVGSpy = jest.spyOn(templaterMod, 'generateWeekIconSVG');
    getCurrentDateStringSpy = jest.spyOn(templaterMod, 'getCurrentDateString');
    getCurrentWeekNumberSpy = jest.spyOn(templaterMod, 'getCurrentWeekNumber');
  });

  describe('applyTemplate', () => {
    const docId = 'testDocId';
    const templateId = 'testTemplateId';
    // Always provide destinationPath to avoid promptForDocumentName for these icon tests
    const destinationPath = 'test/New Document Name'; 

    it('should call generateDateIconSVG and setIcon with its SVG output for icon "{{date}}"', async () => {
      const icon = '{{date}}';
      const currentDate = templaterMod.getCurrentDateString(); // Get the date for assertion
      const expectedSVG = templaterMod.generateDateIconSVG(currentDate); // Generate expected SVG

      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      
      expect(getCurrentDateStringSpy).toHaveBeenCalled();
      expect(generateDateIconSVGSpy).toHaveBeenCalledWith(currentDate);
      expect(setIconSpy).toHaveBeenCalledWith(docId, expectedSVG);
    });

    it('should call generateWeekIconSVG and setIcon with its SVG output for icon "{{week}}"', async () => {
      const icon = '{{week}}';
      const currentWeek = templaterMod.getCurrentWeekNumber(); // Get the week for assertion
      const expectedSVG = templaterMod.generateWeekIconSVG(currentWeek); // Generate expected SVG
      
      await templater.applyTemplate(docId, templateId, destinationPath, icon);

      expect(getCurrentWeekNumberSpy).toHaveBeenCalled();
      expect(generateWeekIconSVGSpy).toHaveBeenCalledWith(currentWeek);
      expect(setIconSpy).toHaveBeenCalledWith(docId, expectedSVG);
    });

    it('should call setIcon with the emoji for a standard emoji icon', async () => {
      const icon = '🚀';
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, '🚀');
      expect(generateDateIconSVGSpy).not.toHaveBeenCalled();
      expect(generateWeekIconSVGSpy).not.toHaveBeenCalled();
    });
    
    it('should call setIcon with the literal string for a custom string icon', async () => {
        const icon = 'custom-string';
        await templater.applyTemplate(docId, templateId, destinationPath, icon);
        expect(setIconSpy).toHaveBeenCalledWith(docId, 'custom-string');
        expect(generateDateIconSVGSpy).not.toHaveBeenCalled();
        expect(generateWeekIconSVGSpy).not.toHaveBeenCalled();
      });

    it('should not call setIcon when icon is undefined', async () => {
      await templater.applyTemplate(docId, templateId, destinationPath, undefined);
      expect(setIconSpy).not.toHaveBeenCalled();
    });
    
    it('should not call setIcon when icon is an empty string', async () => {
      await templater.applyTemplate(docId, templateId, destinationPath, '');
      expect(setIconSpy).not.toHaveBeenCalled();
    });

    it('should call setIcon with the literal string for "test-{{date}}"', async () => {
      const icon = 'test-{{date}}';
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, icon); // Passed literally
      expect(generateDateIconSVGSpy).not.toHaveBeenCalled();
    });

    it('should call setIcon with the literal string for "test-{{week}}"', async () => {
      const icon = 'test-{{week}}';
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, icon); // Passed literally
      expect(generateWeekIconSVGSpy).not.toHaveBeenCalled();
    });
    
    it('should call setIcon with the literal string for "{{date}}-{{week}}"', async () => {
      const icon = '{{date}}-{{week}}';
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, icon); // Passed literally
      expect(generateDateIconSVGSpy).not.toHaveBeenCalled();
      expect(generateWeekIconSVGSpy).not.toHaveBeenCalled();
    });
  });
});
