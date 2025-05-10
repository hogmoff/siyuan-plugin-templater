import { fetchPost, fetchSyncPost, IWebSocketData } from "siyuan";

// Define the response type for fetchPost
interface FetchResponse {
    code: number;
    data?: any;
    msg?: string;
}

export interface TemplateRule {
    pathPattern: string;  // Regex pattern to match document paths
    templateId: string;   // ID of the template to apply
    description?: string; // Optional description of the rule
}

async function request(url: string, data: any) {
    const response: IWebSocketData = await fetchSyncPost(url, data);
    const res = response.code === 0 ? response.data : null;
    return res;
}

export async function getFile(path: string): Promise<any> {
    const data = {
        path: path
    };
    const url = "/api/file/getFile";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export class Templater {
    private rules: TemplateRule[] = [];

    constructor() {
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
    * Apply a template to a document
    */
    async applyTemplate(docId: string, templateId: string): Promise<boolean> {
        try {
            // Add await
            const response = await fetchPost("/api/template/renderTemplate", {
                id: docId,
                path: templateId
            }) as unknown as FetchResponse;
            
            return response && response.code === 0;
        } catch (error) {
            console.error("Failed to apply template:", error);
            return false;
        }
    }
}