import { getCurrentDateString, getCurrentWeekNumber, Templater, DEFAULT_ICON } from './templater';
import * as api from './api'; // Import to allow spying/mocking individual functions

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


describe('Templater Utility Functions', () => {
  describe('getCurrentDateString', () => {
    it('should return a string', () => {
      expect(typeof getCurrentDateString()).toBe('string');
    });

    it('should return a string of length 1 or 2', () => {
      const dateStr = getCurrentDateString();
      expect(dateStr.length).toBeGreaterThanOrEqual(1);
      expect(dateStr.length).toBeLessThanOrEqual(2);
    });

    it('should return a valid day format (D or DD)', () => {
      const dateStr = getCurrentDateString();
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
      expect(typeof getCurrentWeekNumber()).toBe('string');
    });

    it('should be parseable to a number', () => {
      const weekStr = getCurrentWeekNumber();
      expect(() => parseInt(weekStr, 10)).not.toThrow();
    });

    it('should be a number between 1 and 53', () => {
      const weekStr = getCurrentWeekNumber();
      const weekNum = parseInt(weekStr, 10);
      expect(weekNum).toBeGreaterThanOrEqual(1);
      expect(weekNum).toBeLessThanOrEqual(53);
    });
  });
});

describe('Templater Class', () => {
  let templater: Templater;

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
  });

  describe('applyTemplate', () => {
    const docId = 'testDocId';
    const templateId = 'testTemplateId';
    // Always provide destinationPath to avoid promptForDocumentName for these icon tests
    const destinationPath = 'test/New Document Name'; 

    it('should call setIcon with processed date string when icon is {{date}}', async () => {
      const icon = '{{date}}';
      const expectedDate = getCurrentDateString();
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, expectedDate);
    });

    it('should call setIcon with processed week string when icon is {{week}}', async () => {
      const icon = '{{week}}';
      const expectedWeek = getCurrentWeekNumber();
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, expectedWeek);
    });

    it('should call setIcon with the emoji when icon is a standard emoji', async () => {
      const icon = '🚀';
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, '🚀');
    });

    it('should not call setIcon when icon is undefined', async () => {
      await templater.applyTemplate(docId, templateId, destinationPath, undefined);
      expect(setIconSpy).not.toHaveBeenCalled();
    });
    
    it('should not call setIcon when icon is an empty string', async () => {
      await templater.applyTemplate(docId, templateId, destinationPath, '');
      expect(setIconSpy).not.toHaveBeenCalled();
    });

    it('should call setIcon with processed combined string for "test-{{date}}"', async () => {
      const icon = 'test-{{date}}';
      const expectedDate = getCurrentDateString();
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, `test-${expectedDate}`);
    });

    it('should call setIcon with processed combined string for "test-{{week}}"', async () => {
      const icon = 'test-{{week}}';
      const expectedWeek = getCurrentWeekNumber();
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, `test-${expectedWeek}`);
    });
    
    it('should call setIcon with processed combined string for "{{date}}-{{week}}"', async () => {
      const icon = '{{date}}-{{week}}';
      const expectedDate = getCurrentDateString();
      const expectedWeek = getCurrentWeekNumber();
      await templater.applyTemplate(docId, templateId, destinationPath, icon);
      expect(setIconSpy).toHaveBeenCalledWith(docId, `${expectedDate}-${expectedWeek}`);
    });

    it('should call setIcon with processed combined string for "{{date}} and {{week}}"', async () => {
        const icon = '{{date}} and {{week}}';
        const expectedDate = getCurrentDateString();
        const expectedWeek = getCurrentWeekNumber();
        await templater.applyTemplate(docId, templateId, destinationPath, icon);
        expect(setIconSpy).toHaveBeenCalledWith(docId, `${expectedDate} and ${expectedWeek}`);
      });

  });
});
