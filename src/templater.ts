import { Dialog, IObject } from "siyuan";
import { 
    getFile, 
    getWorkspaceDir, 
    getNotebookIdByDocId, 
    renameDocbyId, 
    getHPathByID, 
    renderTemplate, 
    getChildBlocks, 
    insertBlock,
    deleteBlock
} from "./api";

export interface TemplateRule {
    pathPattern: string;  // Regex pattern to match document paths
    templateId: string;   // ID of the template to apply
    description?: string; // Optional description of the rule
}

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

    constructor(i18: IObject) {
        this.i18n = i18;
        this.loadRules();
    }

    /**
    * Load template rules from storage
    */   
    async loadRules(): Promise<void> {
        try {
        const parsedData = await getFile("/data/plugins/siyuan-plugin-templater/rules.json");
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
            formData.append("path", "/data/plugins/siyuan-plugin-templater/rules.json");
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
    findTemplateForPath(docPath: string): string | null {
        for (const rule of this.rules) {
            try {
                const regex = new RegExp(rule.pathPattern);
                if (regex.test(docPath)) {
                    return rule.templateId;
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
                <button class="b3-button b3-button--text">${this.i18n.confirm}</button>
            </div>
            </div>`,
            width: "400px",
            height: "180px"
        });
        
        // Add event listeners for the buttons after dialog is created
        const confirmButton = dialog.element.querySelector(".b3-button--text");
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
    async applyTemplate(docId: string, templateId: string): Promise<boolean> {
        try {

            // First, prompt for the document name
            const newName = await this.promptForDocumentName();
            if (!newName) {
                // User cancelled the operation
                return false;
            }

            // Get NotebookId
            const notebookId = await getNotebookIdByDocId(docId);
            console.log(`Notebook ID: ${notebookId}`);

            // Rename the document
            const responseRename = await renameDocbyId(docId, newName);
            if (!responseRename) {
                console.error("Failed to rename document:", responseRename);
                return false;
            }

            // Get first BlockId
            const firstBlock = await getChildBlocks(docId);
            if (!firstBlock || !firstBlock.data) {
                console.error("Failed to get first block:", firstBlock);
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
            const insertResponse = await insertBlock("", firstBlock.data[0].id, "", renderResponse.content);            
            if (!insertResponse || insertResponse.code !== 0) {
                console.error("Failed to insert block: ", insertResponse);
                return false;
            }

            // delete first block (empty)
            const deleteResponse =await deleteBlock(firstBlock.data[0].id);
            if (!deleteResponse || deleteResponse.code !== 0) {
                console.error("Failed to delete block: ", deleteResponse);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error("Failed to apply template:", error);
            return false;
        }
    }

}