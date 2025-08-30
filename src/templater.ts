import { Dialog, IObject } from "siyuan";
import { 
    getFile, 
    getWorkspaceDir, 
    getNotebookIdByDocId, 
    createDocWithMd,
    renameDocbyId, 
    moveDocbyId,
    getHPathByID, 
    getIDsByHPath,
    renderTemplate, 
    setIcon,
    getChildBlocks, 
    insertBlock,
    deleteBlock,
    renderSprig
} from "./api";
import { applyTemplaterFunctions } from "./extendedFunctions";

export interface TemplateRule {
    pathPattern: string;  // Regex pattern to match document paths
    templateId: string;   // ID of the template to apply
    description?: string; // Optional description of the rule
    destinationPath?: string; // Optional path to move the document after applying template
    icon?: string; // Optional emoji icon for the document
    iconUrl?: string; // Optional URL for the icon
    hotkey?: string; // Optional hotkey to trigger template copy
}

// Standardvalue for icon
export const DEFAULT_ICON = "📄";

// Create a function to get the path of a document by its ID using getHPathbyID
export async function getDocumentPathById(docId: string): Promise<any> {
    const response = await getHPathByID(docId);
    if (response && response.data) {
        const path_name = response.data;
        // remove string after last '/' in path_name
        const path = path_name.substring(0, path_name.lastIndexOf("/"));
        return path;
    }
    else {
        return null;
    }
}

export class Templater {
    private rules: TemplateRule[] = [];
    private i18n;
    private dataPath = "";

    constructor(pluginId:string, i18: IObject) {
        this.i18n = i18;
        this.dataPath = `/data/storage/plugins/${pluginId}/rules.json`;
        this.loadRules();
    }

    /**
    * Load template rules from storage
    */   
    async loadRules(): Promise<void> {
        try {
        const parsedData = await getFile(this.dataPath);
        if (parsedData) {
            try {
                if (Array.isArray(parsedData)) {
                    this.rules = parsedData;
                } else {
                    console.warn("Rules file does not contain an array, initializing empty rules");
                    this.rules = [];
                }
            } catch (parseError) {
                console.error("Failed to parse template rules:", parseError);
                this.rules = [];
            }
        } else {
            // File doesn't exist yet or couldn't be loaded
            console.info("Template rules file not found. Creating a new one.");
            this.rules = [];
            // Create the initial empty rules file
            await this.saveRules();
        }
        } catch (error) {
            console.error("Failed to load template rules:", error);
            this.rules = [];
            // Try to create the initial file
            try {
                await this.saveRules();
            } catch (saveError) {
                console.error("Failed to create initial rules file:", saveError);
            }
        }
    }

    public setRules(newRules: TemplateRule[]): void {
        this.rules = newRules;
    }

    /**
    * Save template rules to storage
    */
    async saveRules(): Promise<void> {
        try {
            // Create a Blob with the JSON data
            const jsonData = JSON.stringify(this.rules, null, 2);
            const blob = new Blob([jsonData], { type: "application/json" });
            
            // Create FormData and append the file
            const formData = new FormData();
            formData.append("path", this.dataPath);
            formData.append("file", blob, "rules.json");
            
            // Use fetch directly instead of fetchPost for file uploads
            const response = await fetch("/api/file/putFile", {
                method: "POST",
                body: formData
            });
            
            const responseData = await response.json();
            
            if (!responseData || responseData.code !== 0) {
                console.error("Failed to save template rules:", responseData);
            }
        } catch (error) {
            console.error("Failed to save template rules:", error);
        }
    }

    /**
    * Add a new template rule
    */
    async addRule(rule: TemplateRule): Promise<void> {
        this.rules.push(rule);
        await this.saveRules();
    }

    /**
    * Remove a template rule
    */
    async removeRule(index: number): Promise<void> {
        if (index >= 0 && index < this.rules.length) {
            this.rules.splice(index, 1);
            await this.saveRules();
        }
    }

    /**
    * Update an existing template rule
    */
    async updateRule(index: number, rule: TemplateRule): Promise<void> {
        if (index >= 0 && index < this.rules.length) {
            this.rules[index] = rule;
            await this.saveRules();
        }
    }

    /**
    * Get all template rules
    */
    getRules(): TemplateRule[] {
        return [...this.rules];
    }

    /**
    * Find a matching template for the given document path
    */
    findTemplateForPath(docPath: string): TemplateRule | null {
        for (const rule of this.rules) {
            try {
                const regex = new RegExp(rule.pathPattern);
                if (regex.test(docPath)) {
                    if (!rule.icon) {
                        rule.icon = DEFAULT_ICON;
                    }
                    return rule;
                }
            } catch (error) {
                console.error(`Invalid regex pattern in rule: ${rule.pathPattern}`, error);
            }
        }
        return null;
    }
    
    /**
    * Prompt the user for a document name
    */
    private promptForDocumentName(): Promise<string | null> {
        return new Promise((resolve) => {
        const dialog = new Dialog({
            title: this.i18n.newDocument,
            content: `<div class="b3-dialog__content">
            <input class="b3-text-field fn__block" placeholder="${this.i18n.enterDocName}" id="templater-doc-name">
            <div class="b3-dialog__action">
                <button class="b3-button b3-button--cancel" style="margin-right: 8px;">${this.i18n.cancel}</button>
                <button class="b3-button b3-button--saveDoc">${this.i18n.confirm}</button>
            </div>
            </div>`,
            width: "400px",
            height: "180px"
        });
        
        // Add event listeners for the buttons after dialog is created
        const confirmButton = dialog.element.querySelector(".b3-button--saveDoc");
        const cancelButton = dialog.element.querySelector(".b3-button--cancel");
        
        confirmButton.addEventListener("click", () => {
            const nameInput = document.getElementById("templater-doc-name") as HTMLInputElement;
            resolve(nameInput.value.trim());
            dialog.destroy();
        });
        
        cancelButton.addEventListener("click", () => {
            resolve(null);
            dialog.destroy();
        });
        
        // Focus the input field with proper typing
        const inputElement = dialog.element.querySelector("#templater-doc-name") as HTMLInputElement;
        if (inputElement) {
            inputElement.focus();
        }
        });
    }

    /**
     * Apply a template to a document
     */
    async applyTemplate(docId: string, templateId: string, destinationPath: string, icon?: string, iconUrl?: string): Promise<boolean> {
        try {
            let newName;
            let newPath;
    
            if (! destinationPath || destinationPath.length == 0){
                // Prompt for the document name
                newName = await this.promptForDocumentName();
                newPath = "";
                if (!newName) {
                    // User cancelled the operation
                    return false;
                }
            }
            else {
                // Render SprigPath    
                const sprigPath = await renderSprig(destinationPath);    
                if (!sprigPath) return false;
    
                if (sprigPath.includes("/")) {
                    const sprigPathParts = sprigPath.split("/");
                    newName = sprigPathParts[sprigPathParts.length - 1];
                    newPath = sprigPathParts.slice(0, -1).join("/");
                }
                else {
                    newName = sprigPath;
                    newPath = "";
                }
            } 
            
            // Rename the document
            const responseRename = await renameDocbyId(docId, newName);
            if (!responseRename) {
                console.error("Failed to rename document:", docId);
                return false;
            }    
            
            // Get first BlockId
            const firstBlocks = await getChildBlocks(docId);
            if (!firstBlocks || !firstBlocks.data) {
                console.error("Failed to get blocks:", firstBlocks);
                return false;
            }
            
            // First, render the template to get its content
            const absPath = await getWorkspaceDir() + "/" + templateId;
            const renderResponse = await renderTemplate(docId, absPath);    
            if (!renderResponse || !renderResponse.content) {
                console.error("Failed to render template:", renderResponse);
                return false;
            }
            
            // Now insert the rendered content into the document before first block
            const insertResponse = await insertBlock("", firstBlocks.data[0].id, "", renderResponse.content);    
            if (!insertResponse || insertResponse.code !== 0) {
                console.error("Failed to insert block: ", insertResponse);
                return false;
            }
            
            // delete first block (empty)
            const deleteResponse = await deleteBlock(firstBlocks.data[0].id);
            if (!deleteResponse || deleteResponse.code !== 0) {
                console.error("Failed to delete block: ", deleteResponse);
                return false;
            }
    
            // NotebookID
            await new Promise(resolve => setTimeout(resolve, 200));
            const notebookId = await getNotebookIdByDocId(docId);
    
            if (newPath.length > 0) {    
                // Create Folder if not exist
                const ids = await getIDsByHPath(notebookId, newPath);
                let newPathDocId = null;
                if (!ids || ids.length === 0) {
                    newPathDocId = await createDocWithMd(notebookId, newPath, "");
                }    
        
                // Move document to destination path if specified            
                const moveResponse = await moveDocbyId(docId, newPath, notebookId, newPathDocId);
                if (!moveResponse || moveResponse.code !== 0) {
                    console.error("Failed to move document to destination path:", moveResponse);
                }
            }
    
            // Set Icon if provided
            if (icon && icon.length > 0) {
                const iconResponse = await setIcon(docId, icon, iconUrl);
                if (!iconResponse || iconResponse.code !== 0) {
                    console.error("Failed to set document icon:", iconResponse);
                }
            }

            // Apply Templater Functions
            await applyTemplaterFunctions(docId);
            
            return true;
        } catch (error) {
            console.error("Failed to apply template:", error);
            return false;
        }
    }

    /**
     * Create a new document based on a rule and apply its template directly.
     * Used for hotkey-triggered creation.
     */
    async createDocFromRule(notebookId: string, rule: TemplateRule): Promise<boolean> {
        try {
            if (!rule || !rule.templateId) return false;

            // Determine name and path
            let newName: string;
            let newPath = "";

            if (!rule.destinationPath || rule.destinationPath.length === 0) {
                newName = await this.promptForDocumentName();
                if (!newName) return false;
            } else {
                const sprigPath = await renderSprig(rule.destinationPath);
                if (!sprigPath) return false;
                if (sprigPath.includes("/")) {
                    const parts = sprigPath.split("/");
                    newName = parts[parts.length - 1];
                    newPath = parts.slice(0, -1).join("/");
                } else {
                    newName = sprigPath;
                    newPath = "";
                }
            }

            // Create the document at target path
            const fullPath = newPath && newPath.length > 0 ? `${newPath}/${newName}` : newName;
            const newDocId = await createDocWithMd(notebookId, fullPath, "");
            if (!newDocId) {
                console.error("Failed to create document for hotkey rule");
                return false;
            }

            // Get first block to insert content after
            const firstBlocks = await getChildBlocks(newDocId);
            if (!firstBlocks || !firstBlocks.data) {
                console.error("Failed to get blocks for new doc:", firstBlocks);
                return false;
            }

            // Render the template
            const absPath = (await getWorkspaceDir()) + "/" + rule.templateId;
            const renderResponse = await renderTemplate(newDocId, absPath);
            if (!renderResponse || !renderResponse.content) {
                console.error("Failed to render template for hotkey rule:", renderResponse);
                return false;
            }

            // Insert rendered content and remove initial empty block
            const insertResponse = await insertBlock("", firstBlocks.data[0].id, "", renderResponse.content);
            if (!insertResponse || insertResponse.code !== 0) {
                console.error("Failed to insert rendered content for hotkey rule:", insertResponse);
                return false;
            }

            const deleteResponse = await deleteBlock(firstBlocks.data[0].id);
            if (!deleteResponse || deleteResponse.code !== 0) {
                console.error("Failed to delete initial block for hotkey rule:", deleteResponse);
                return false;
            }

            // Set icon if provided
            if (rule.icon && rule.icon.length > 0) {
                const iconResponse = await setIcon(newDocId, rule.icon, rule.iconUrl || "");
                if (!iconResponse || iconResponse.code !== 0) {
                    console.error("Failed to set icon on new doc:", iconResponse);
                }
            }

            // Apply extended templater functions
            await applyTemplaterFunctions(newDocId);

            return true;
        } catch (error) {
            console.error("Failed to create document from rule:", error);
            return false;
        }
    }
}
