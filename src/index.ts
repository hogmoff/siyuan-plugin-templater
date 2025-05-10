import {
    Plugin,
    showMessage,
    Dialog,
    Setting,
} from "siyuan";
import "./index.scss";
import { Templater, TemplateRule } from "./templater";

export default class TemplaterPlugin extends Plugin {
    private templater: Templater;
    public setting: Setting;

    async onload() {
        this.templater = new Templater();
        
        // Add icon for the plugin
        this.addIcons(`<symbol id="iconTemplate" viewBox="0 0 32 32">
            <path ds="M28 4v26h-24v-26h24zM30 2h-28v30h28v-30zM16 12h8v2h-8v-2zM16 16h8v2h-8v-2zM16 20h8v2h-8v-2zM8 12h6v10h-6v-10z"></path>
        </symbol>`);

        // Add top bar button
        this.addTopBar({
            icon: "iconTemplate",
            title: this.i18n.addTopBarIcon,
            position: "right",
            callback: () => {
                this.openSettings();
            }
        });

        // Listen for document creation events
        this.eventBus.on("loaded-protyle-dynamic", this.handleDocumentLoaded.bind(this));

        // Initialize settings
        this.initSettings();
        
        console.log("Templater plugin loaded");
    }

    async onLayoutReady() {
        // Additional initialization if needed
    }

    onunload() {
        console.log("Templater plugin unloaded");
    }

    private async handleDocumentLoaded(event: any) {
        // Check if this is a new document
        const detail = event.detail;
        if (detail && detail.isNew && detail.protyle && detail.protyle.path) {
            const docPath = detail.protyle.path;
            const docId = detail.protyle.block.rootID;
            
            // Find matching template
            const templateId = this.templater.findTemplateForPath(docPath);
            if (templateId) {
                // Apply the template
                const success = await this.templater.applyTemplate(docId, templateId);
                if (success) {
                    showMessage(`Applied template to new document: ${docPath}`);
                } else {
                    // Fix: In SiYuan, showMessage accepts a message and an optional timeout in ms
                    showMessage(`Failed to apply template to: ${docPath}`, 7000); // Show for 7 seconds
                }
            }
        }
    }

    private initSettings() {
        this.setting = new Setting({
            confirmCallback: () => {
                // Save settings if needed
            }
        });

        // Add button to open template rules management
        const btnManageRules = document.createElement("button");
        btnManageRules.className = "b3-button b3-button--outline fn__flex-center fn__size200";
        btnManageRules.textContent = "Manage Template Rules";
        btnManageRules.addEventListener("click", () => {
            this.openRulesDialog();
        });

        this.setting.addItem({
            title: "Template Rules",
            description: "Manage rules for applying templates based on document paths",
            actionElement: btnManageRules,
        });
    }

    private openSettings() {
        this.setting.open("Path-based Templates");
    }

    private openRulesDialog() {
        const rules = this.templater.getRules();
        
        let rulesHTML = "";
        rules.forEach((rule, index) => {
            rulesHTML += `
            <div class="template-rule" data-index="${index}">
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">Path Pattern (Regex)</div>
                        <input class="b3-text-field fn__block path-pattern" value="${rule.pathPattern}">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-1">
                        <div class="b3-label">Template ID</div>
                        <input class="b3-text-field fn__block template-id" value="${rule.templateId}">
                    </div>
                </div>
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">Description</div>
                        <input class="b3-text-field fn__block description" value="${rule.description || ""}">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-center" style="align-self: flex-end;">
                        <button class="b3-button b3-button--outline remove-rule">Remove</button>
                    </div>
                </div>
                <div class="fn__hr"></div>
            </div>`;
        });

        const dialog = new Dialog({
            title: "Template Rules",
            content: `
            <div class="b3-dialog__content">
                <div class="template-rules-container">
                    ${rulesHTML}
                </div>
                <div class="fn__hr"></div>
                <div class="fn__flex">
                    <div class="fn__flex-1"></div>
                    <button class="b3-button add-rule">Add New Rule</button>
                </div>
            </div>
            <div class="b3-dialog__action">
                <button class="b3-button b3-button--cancel">Cancel</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--text">Save</button>
            </div>`,
            width: "800px",
        });

        // Add event listeners
        const addRuleBtn = dialog.element.querySelector(".add-rule");
        addRuleBtn.addEventListener("click", () => {
            const container = dialog.element.querySelector(".template-rules-container");
            const newIndex = rules.length;
            const newRuleHTML = `
            <div class="template-rule" data-index="${newIndex}">
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">Path Pattern (Regex)</div>
                        <input class="b3-text-field fn__block path-pattern" value="">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-1">
                        <div class="b3-label">Template ID</div>
                        <input class="b3-text-field fn__block template-id" value="">
                    </div>
                </div>
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">Description</div>
                        <input class="b3-text-field fn__block description" value="">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-center" style="align-self: flex-end;">
                        <button class="b3-button b3-button--outline remove-rule">Remove</button>
                    </div>
                </div>
                <div class="fn__hr"></div>
            </div>`;
            container.insertAdjacentHTML("beforeend", newRuleHTML);
            
            // Add event listener to the new remove button
            const newRemoveBtn = container.querySelector(`.template-rule[data-index="${newIndex}"] .remove-rule`);
            newRemoveBtn.addEventListener("click", (e) => {
                const ruleElement = (e.target as HTMLElement).closest(".template-rule");
                ruleElement.remove();
            });
        });

        // Add event listeners to existing remove buttons
        const removeButtons = dialog.element.querySelectorAll(".remove-rule");
        removeButtons.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const ruleElement = (e.target as HTMLElement).closest(".template-rule");
                ruleElement.remove();
            });
        });

        // Save button
        const saveBtn = dialog.element.querySelector(".b3-button--text");
        saveBtn.addEventListener("click", async () => {
            const ruleElements = dialog.element.querySelectorAll(".template-rule");
            const newRules: TemplateRule[] = [];
            
            ruleElements.forEach(el => {
                const pathPattern = (el.querySelector(".path-pattern") as HTMLInputElement).value;
                const templateId = (el.querySelector(".template-id") as HTMLInputElement).value;
                const description = (el.querySelector(".description") as HTMLInputElement).value;
                
                if (pathPattern && templateId) {
                    newRules.push({
                        pathPattern,
                        templateId,
                        description: description || undefined
                    });
                }
            });
            
            // Update rules
            this.templater["rules"] = newRules;
            await this.templater.saveRules();
            
            showMessage("Template rules saved successfully");
            dialog.destroy();
        });
        
        // Cancel button
        const cancelBtn = dialog.element.querySelector(".b3-button--cancel");
        cancelBtn.addEventListener("click", () => {
            dialog.destroy();
        });
    }
}