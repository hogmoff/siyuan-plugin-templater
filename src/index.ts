import {
    Plugin,
    showMessage,
    Dialog,
    Setting,
} from "siyuan";
import "./index.scss";
import { Templater, TemplateRule, getDocumentPathById } from "./templater";

export default class TemplaterPlugin extends Plugin {
    private templater: Templater;
    public setting: Setting;
    private processedDocuments: Set<string> = new Set();

    async onload() {
        this.templater = new Templater(this.name, this.i18n);
        
        // Add icon for the plugin
        this.addIcons(`<symbol id="iconTemplater" viewBox="0 0 256.000000 256.000000">
<g transform="translate(0.000000,256.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
<path d="M800 2557 c0 -1 22 -69 49 -150 l50 -147 -26 -75 -25 -75 -134 0
-135 0 -200 -151 c-110 -83 -199 -153 -196 -155 2 -2 91 -69 197 -149 l193
-145 138 0 137 0 26 -78 26 -77 -50 -150 c-27 -82 -50 -151 -50 -152 0 -2 56
-3 125 -3 l125 0 0 -236 c0 -221 -1 -236 -17 -229 -35 15 -124 17 -169 5 -48
-14 -129 -79 -153 -123 -13 -24 -16 -25 -85 -20 -64 5 -76 2 -126 -24 -34 -18
-66 -45 -85 -72 -26 -37 -30 -53 -34 -122 l-3 -79 -74 0 -74 0 0 -75 0 -75
1050 0 1050 0 0 75 0 75 -225 0 -225 0 0 123 c0 107 -3 128 -24 172 -29 63
-101 128 -161 145 -44 12 -133 10 -167 -5 -17 -7 -18 8 -18 229 l0 236 233 0
234 0 194 146 c107 80 198 149 203 154 4 4 -81 75 -190 157 l-198 148 -139 5
-140 5 -24 70 -23 69 26 78 26 78 137 0 138 0 194 146 c107 80 195 148 196
152 1 4 -87 73 -196 155 l-198 147 -591 0 c-326 0 -592 -1 -592 -3z m1231
-219 c54 -40 98 -75 98 -78 0 -3 -44 -38 -98 -77 l-98 -73 -462 0 c-253 0
-461 1 -461 3 0 2 11 36 24 75 l25 72 -25 72 c-13 39 -24 73 -24 75 0 2 208 3
461 3 l462 0 98 -72z m-481 -381 c0 -2 -11 -36 -24 -75 l-25 -72 25 -72 c13
-39 24 -73 24 -75 0 -2 -208 -3 -463 -3 l-464 0 -92 69 c-51 38 -93 73 -93 77
-1 5 41 41 93 81 l94 72 463 0 c254 1 462 0 462 -2z m471 -518 c52 -38 98 -74
102 -78 4 -4 -38 -42 -94 -85 l-103 -76 -458 0 c-252 0 -458 4 -458 8 0 5 11
40 23 78 l24 69 -24 69 c-12 39 -23 74 -23 78 0 4 206 8 458 8 l459 0 94 -71z
m-663 -836 l-3 -448 -75 0 -75 0 -3 448 -2 447 80 0 80 0 -2 -447z m-342 -187
l34 -34 0 -116 0 -116 -110 0 -110 0 0 116 0 116 34 34 c28 28 42 34 76 34 34
0 48 -6 76 -34z m680 0 l34 -34 0 -116 0 -116 -110 0 -110 0 0 116 0 116 34
34 c28 28 42 34 76 34 34 0 48 -6 76 -34z m-1046 -134 c18 -14 24 -32 28 -75
l4 -57 -76 0 -76 0 0 52 c0 39 5 57 22 75 26 28 67 30 98 5z"/>
</g></symbol>`);

        // Add top bar button
        this.addTopBar({
            icon: "iconTemplater",
            title: this.i18n.settings || "Settings",
            position: "right",
            callback: () => {
                this.openSettings();
            }
        });

        // Listen for document creation       
        this.eventBus.on("switch-protyle", this.handleDocumentLoaded.bind(this)); 

        // Load Rules
        await this.templater.loadRules();

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
        if (!detail || !detail.protyle || !detail.protyle.path) {
            return;
        }

        // Get Document ID
        const docId = detail.protyle.block?.rootID;
        if (!docId) {
            return;
        }

        // Skip if we've already processed this document
        if (this.processedDocuments.has(docId)) {
            return;
        }
        
        // Check if it's a new document by examining the action array
        const isNew = detail.isNew || (
            detail.protyle && 
            detail.protyle.options && 
            detail.protyle.options.action && 
            Array.isArray(detail.protyle.options.action) && 
            detail.protyle.options.action.includes("cb-get-opennew")
        );
    
        if (isNew) {
            const docPath = detail.protyle.path;
            const HdocPath = await getDocumentPathById(docId);
            
            // Find matching template
            const templateId = this.templater.findTemplateForPath(HdocPath);
            if (templateId) {
                // Add to processed list first to prevent double processing
                this.processedDocuments.add(docId);

                // Apply the template
                const success = await this.templater.applyTemplate(docId, templateId);
                if (success) {
                    showMessage(this.i18n.templateApplied + `${docPath}`, 3000, "info");
                } else {
                    showMessage(this.i18n.templateAppliedFailed + `${docPath}`, 7000, "error"); 
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
        
        // Create a container for the button
        const btnManageRules = document.createElement("button");
        btnManageRules.className = "b3-button b3-button--outline";
        btnManageRules.textContent = this.i18n.ruleManagementButton;
        btnManageRules.addEventListener("click", () => {
            this.openRulesDialog();
        });
        
        // Create a container for the rules table
        const rulesTableContainer = document.createElement("div");
        rulesTableContainer.className = "templater-rules-table";
        rulesTableContainer.style.marginTop = "10px";
        rulesTableContainer.style.width = "100%";
        
        // Create and populate the rules table
        this.updateRulesTable(rulesTableContainer);
        
        // Add the button to settings
        this.setting.addItem({
            title: this.i18n.templateRules,
            description: this.i18n.ruleManagmentDescription,
            actionElement: btnManageRules,
        });
        
        // Add the table as a separate item with empty title and description
        // This will position it in the main content area
        this.setting.addItem({
            title: "",
            description: "",
            actionElement: rulesTableContainer,
        });
    }

    // Helper method to update the rules table
    private updateRulesTable(container: HTMLElement) {
        const rules = this.templater.getRules();
        
        // Clear existing content
        container.innerHTML = "";
        
        if (rules.length === 0) {
            container.innerHTML = `<div class='b3-label'>${this.i18n.noTemplate}</div>`;
            return;
        }
        
        // Create table
        const table = document.createElement("table");
        table.className = "b3-table";
        table.style.width = "100%";
        
        // Add header
        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>${this.i18n.description}</th>
                <th>${this.i18n.pathPattern}</th>
                <th>${this.i18n.template}</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Add rows
        const tbody = document.createElement("tbody");
        rules.forEach(rule => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${rule.description}</td>
                <td>${rule.pathPattern}</td>
                <td>${rule.templateId}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        container.appendChild(table);
    }

    private openSettings() {
        this.setting.open(this.i18n.settings);
    }

    private openRulesDialog() {
        const rules = this.templater.getRules();
        
        let rulesHTML = "";
        rules.forEach((rule, index) => {
            rulesHTML += `
            <div class="template-rule" data-index="${index}">
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.pathPattern}</div>
                        <input class="b3-text-field fn__block path-pattern" value="${rule.pathPattern}">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.template}</div>
                        <input class="b3-text-field fn__block template-id" value="${rule.templateId}">
                    </div>
                </div>
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.description}</div>
                        <input class="b3-text-field fn__block description" value="${rule.description || ""}">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-center" style="align-self: flex-end;">
                        <button class="b3-button b3-button--outline remove-rule">${this.i18n.remove}</button>
                    </div>
                </div>
                <div class="fn__hr"></div>
            </div>`;
        });

        const dialog = new Dialog({
            title: this.i18n.templateRules,
            content: `
            <div class="b3-dialog__content">
                <div class="template-rules-container">
                    ${rulesHTML}
                </div>
                <div class="fn__hr"></div>
                <div class="fn__flex">
                    <div class="fn__flex-1"></div>
                    <button class="b3-button add-rule">${this.i18n.add}</button>
                </div>
            </div>
            <div class="b3-dialog__action">
                <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--text">${this.i18n.save}</button>
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
                        <div class="b3-label">${this.i18n.pathPattern}</div>
                        <input class="b3-text-field fn__block path-pattern" value="">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.template}</div>
                        <input class="b3-text-field fn__block template-id" value="">
                    </div>
                </div>
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.description}</div>
                        <input class="b3-text-field fn__block description" value="">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-center" style="align-self: flex-end;">
                        <button class="b3-button b3-button--outline remove-rule">${this.i18n.remove}</button>
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

        // Save Button
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
            
            // Update the rules table in settings
            const rulesTableContainer = document.querySelector(".templater-rules-table");
            if (rulesTableContainer) {
                this.updateRulesTable(rulesTableContainer as HTMLElement);
            }
            
            showMessage(this.i18n.templateRulesSaved, 3000, "info");
            dialog.destroy();
        });
        
        // Cancel button
        const cancelBtn = dialog.element.querySelector(".b3-button--cancel");
        cancelBtn.addEventListener("click", () => {
            dialog.destroy();
        });
    }
}