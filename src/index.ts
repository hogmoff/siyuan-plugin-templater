import {
    Plugin,
    showMessage,
    Dialog,
    Setting,
} from "siyuan";
import "./index.scss";
import { Templater, TemplateRule, getDocumentPathById, DEFAULT_ICON } from "./templater";
export { setIcon } from "./api"; // Export for testing

export default class TemplaterPlugin extends Plugin {
    private templater: Templater;
    public setting: Setting;
    private processedDocuments: Set<string> = new Set();
    private pluginPath: string;

    async onload() {
        this.templater = new Templater(this.name, this.i18n);
        this.pluginPath = `/data/plugins/${this.name}`;
        
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
            const matchedRule = this.templater.findTemplateForPath(HdocPath);
            if (matchedRule) {
                // Add to processed list first to prevent double processing
                this.processedDocuments.add(docId);
                
                // Apply the template with destination path and icon if specified
                const success = await this.templater.applyTemplate(
                    docId, 
                    matchedRule.templateId, 
                    matchedRule.destinationPath,
                    matchedRule.icon
                );
                
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
            <th>${this.i18n.destinationPath || "Destination Path"}</th>
            <th>${this.i18n.icon || "Icon"}</th>
        </tr>
        `;
        table.appendChild(thead);
        
        // Add rows
        const tbody = document.createElement("tbody");
        rules.forEach(rule => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${rule.description || ""}</td>
            <td>${rule.pathPattern}</td>
            <td>${rule.templateId}</td>
            <td>${rule.destinationPath || ""}</td>
            <td>${rule.icon || ""}</td>
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
            const escapedDestinationPath = (rule.destinationPath || "").replace(/"/g, "&quot;");
            const iconValue = rule.icon || DEFAULT_ICON;
            rulesHTML += `
            <div class="template-rule" data-index="${index}">                
                <!-- Path Pattern and Template -->
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
                <!-- Description, Destination Path and Icon -->
                <div class="fn__flex">    
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.description}</div>
                        <input class="b3-text-field fn__block description" value="${rule.description || ""}">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.destinationPath}</div>
                        <input class="b3-text-field fn__block destination-path" value="${escapedDestinationPath}">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-0">
                    <div class="b3-label">${this.i18n.icon || "Icon"}</div>
                        <div class="fn__flex">
                            <button class="b3-button b3-button--outline emoji-picker-btn" 
                            data-icon="${iconValue}" 
                            style="min-width: 60px; padding: 0 8px; height: 32px; line-height: 32px;">
                            ${iconValue}
                            </button>
                            <input type="hidden" class="icon" value="${rule.icon || DEFAULT_ICON}">
                        </div>
                    </div>
                </div>
                <!-- Remove Button -->
                <div class="fn__flex" style="margin-top: 8px;">
                    <div class="fn__flex-1"></div>
                    <button class="b3-button b3-button--outline remove-rule">
                        ${this.i18n.remove}
                    </button>
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

        // Add event listeners for emoji picker buttons
        const emojiButtons = dialog.element.querySelectorAll(".emoji-picker-btn");
        emojiButtons.forEach(btn => {
            btn.addEventListener("click", (e) => {
                this.showEmojiPicker(e.target as HTMLElement);
            });
        });

        // Add event listeners
        const addRuleBtn = dialog.element.querySelector(".add-rule");
        addRuleBtn.addEventListener("click", () => {
            const container = dialog.element.querySelector(".template-rules-container");
            const newIndex = rules.length;
            
            // Inside the addRuleBtn.addEventListener("click", () => { ... }) function:
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
                    <div class="fn__flex-1">
                    <div class="b3-label">${this.i18n.destinationPath || "Destination Path"}</div>
                    <input class="b3-text-field fn__block destination-path" value="">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-0">
                        <div class="b3-label">${this.i18n.icon || "Icon"}</div>
                            <div class="fn__flex">
                                <button class="b3-button b3-button--outline emoji-picker-btn" data-icon="${DEFAULT_ICON}" style="min-width: 60px; padding: 0 8px; height: 32px; line-height: 32px;">${DEFAULT_ICON}</button>
                                <input type="hidden" class="icon" value="${DEFAULT_ICON}">
                            </div>
                        </div>
                    </div>
                    <div class="fn__flex" style="margin-top: 8px;">
                    <div class="fn__flex-1"></div>
                    <button class="b3-button b3-button--outline remove-rule">${this.i18n.remove}</button>
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
            
            // Add event listener to the new emoji picker button
            const newEmojiBtn = container.querySelector(`.template-rule[data-index="${newIndex}"] .emoji-picker-btn`);
            newEmojiBtn.addEventListener("click", (e) => {
                this.showEmojiPicker(e.target as HTMLElement);
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
                const destinationPath = (el.querySelector(".destination-path") as HTMLInputElement).value;
                const icon = (el.querySelector(".icon") as HTMLInputElement).value || DEFAULT_ICON;
                        
                if (pathPattern && templateId) {
                    newRules.push({
                        pathPattern,
                        templateId,
                        description: description || undefined,
                        destinationPath: destinationPath || undefined,
                        icon: icon
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
    
    private showEmojiPicker(buttonElement: HTMLElement) {
        const ruleElement = buttonElement.closest(".template-rule");
        if (!ruleElement) return; // Should not happen
        const iconInput = ruleElement.querySelector(".icon") as HTMLInputElement;

        // Access Siyuan's global emoji data
        const emojiCategories = (window as any).siyuan && (window as any).siyuan.emojis;

        if (!emojiCategories || !Array.isArray(emojiCategories) || emojiCategories.length === 0) {
            console.error("Siyuan emoji data not found, empty, or not an array.");
            showMessage(this.i18n.emojiLoadError || "Could not load Siyuan emojis.", 3000, "error");
            
            const errorDialog = new Dialog({
                title: this.i18n.selectEmoji || "Select Emoji",
                content: `<div class="b3-dialog__content"><p>${this.i18n.emojiLoadError || "Could not load Siyuan emojis."}</p></div>
                          <div class="b3-dialog__action"><button class="b3-button b3-button--cancel">${this.i18n.cancel}</button></div>`,
                width: "360px",
            });
            const cancelBtn = errorDialog.element.querySelector(".b3-button--cancel");
            if (cancelBtn) {
                cancelBtn.addEventListener("click", () => errorDialog.destroy());
            }
            return;
        }

        // Function to get localized category title
        const getCategoryTitle = (category: any) => {
            const lang = (window as any).siyuan && (window as any).siyuan.config && (window as any).siyuan.config.lang;
            if (lang === "ja_JP" && category.title_ja_jp) return category.title_ja_jp;
            if (lang === "zh_CN" && category.title_zh_cn) return category.title_zh_cn;
            return category.title || category.id; // Default to title or id
        };

        // Function to convert unicode string to emoji character
        const getEmojiChar = (unicode: string): string => {
            if (!unicode || typeof unicode !== "string") return "?";
            try {
                return unicode.split("-").map(hex => String.fromCodePoint(parseInt(hex, 16))).join("");
            } catch (e) {
                console.error(`Error converting unicode ${unicode} to char:`, e);
                return "?"; // Fallback character
            }
        };

        let emojiPickerHTML = `
            <input type="text" class="b3-text-field fn__block emoji-filter-input" placeholder="${this.i18n.filterEmoji || "Filter emojis..."}" style="margin-bottom: 8px;">
            <div class="emoji-picker-list" style="max-height: 300px; overflow-y: auto;">
                <div class="emoji-category" data-category-id="dynamic-icons">
                    <div class="b3-label" style="margin-top: 10px; margin-bottom: 5px; font-weight: bold;">${this.i18n.dynamicIcons}</div>
                    <div class="emoji-category-items" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px;">
                        <button class="b3-button dynamic-icon-btn" data-icon-value="{{date}}" style="min-width: 80px; height: 36px; padding: 0 8px; background-color: var(--b3-theme-surface); color: var(--b3-theme-on-surface);">{{date}}</button>
                        <button class="b3-button dynamic-icon-btn" data-icon-value="{{week}}" style="min-width: 80px; height: 36px; padding: 0 8px; background-color: var(--b3-theme-surface); color: var(--b3-theme-on-surface);">{{week}}</button>
                    </div>
                </div>
        `;

        emojiCategories.forEach((category: any) => {
            emojiPickerHTML += `
                <div class="emoji-category" data-category-id="${category.id}">
                    <div class="b3-label" style="margin-top: 10px; margin-bottom: 5px; font-weight: bold;">${getCategoryTitle(category)}</div>
                    <div class="emoji-category-items" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); gap: 8px;">
            `;
            if (category.items && Array.isArray(category.items)) {
                category.items.forEach((emoji: any) => {
                    const char = getEmojiChar(emoji.unicode);
                    const description = emoji.description || "";
                    const keywords = emoji.keywords || "";
                    const descriptionJaJp = emoji.description_ja_jp || ""; // Corrected property name
                    const descriptionZhCn = emoji.description_zh_cn || ""; // Corrected property name

                    emojiPickerHTML += `
                        <button class="b3-button emoji-btn" 
                                style="min-width: 36px; height: 36px; padding: 0; font-size: 20px; background-color: var(--b3-theme-surface); color: var(--b3-theme-on-surface);" 
                                data-emoji="${char}"
                                data-description="${description.toLowerCase()}"
                                data-keywords="${keywords.toLowerCase()}"
                                data-description-ja-jp="${descriptionJaJp.toLowerCase()}"
                                data-description-zh-cn="${descriptionZhCn.toLowerCase()}"
                                title="${description}">
                            ${char}
                        </button>
                    `;
                });
            }
            emojiPickerHTML += "</div></div>";
        });

        emojiPickerHTML += "</div>"; // Close emoji-picker-list

        const emojiDialog = new Dialog({
            title: this.i18n.selectEmoji || "Select Emoji",
            content: `
                <div class="b3-dialog__content">
                    ${emojiPickerHTML}
                </div>
                <div class="b3-dialog__action">
                    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
                </div>`,
            width: "420px", 
        });

        const dialogElement = emojiDialog.element;
        const filterInput = dialogElement.querySelector(".emoji-filter-input") as HTMLInputElement;
        const emojiCategoriesElements = dialogElement.querySelectorAll(".emoji-category");

        if (filterInput) {
            filterInput.addEventListener("input", () => {
                const filterText = filterInput.value.toLowerCase().trim();
                emojiCategoriesElements.forEach(categoryEl => {
                    const emojiButtons = categoryEl.querySelectorAll(".emoji-btn");
                    let categoryHasVisibleEmojis = false;
                    emojiButtons.forEach(btn => {
                        const button = btn as HTMLElement;
                        const desc = button.dataset.description || "";
                        const keywords = button.dataset.keywords || "";
                        const descJaJp = button.dataset.descriptionJaJp || "";
                        const descZhCn = button.dataset.descriptionZhCn || "";
                        
                        const isMatch = filterText === "" || 
                                        desc.includes(filterText) || 
                                        keywords.includes(filterText) ||
                                        descJaJp.includes(filterText) ||
                                        descZhCn.includes(filterText);
                        
                        button.style.display = isMatch ? "" : "none";
                        if (isMatch) {
                            categoryHasVisibleEmojis = true;
                        }
                    });
                    // Always show dynamic icons category, otherwise filter it
                    if ((categoryEl as HTMLElement).dataset.categoryId === "dynamic-icons") {
                        (categoryEl as HTMLElement).style.display = "";
                        // also ensure the dynamic icon buttons themselves are not hidden by the filter
                        const dynamicButtons = categoryEl.querySelectorAll(".dynamic-icon-btn");
                        dynamicButtons.forEach(btn => {
                            (btn as HTMLElement).style.display = "";
                        });
                    } else {
                        (categoryEl as HTMLElement).style.display = categoryHasVisibleEmojis ? "" : "none";
                    }
                });
            });
        }

        const emojiButtons = dialogElement.querySelectorAll(".emoji-btn");
        emojiButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const emoji = btn.getAttribute("data-emoji");
                if (emoji) {
                    iconInput.value = emoji;
                    buttonElement.textContent = emoji;
                    buttonElement.setAttribute("data-icon", emoji);
                    emojiDialog.destroy();
                }
            });
        });

        const dynamicIconButtons = dialogElement.querySelectorAll(".dynamic-icon-btn");
        dynamicIconButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const iconValue = btn.getAttribute("data-icon-value");
                if (iconValue) {
                    iconInput.value = iconValue;
                    buttonElement.textContent = iconValue;
                    buttonElement.setAttribute("data-icon", iconValue); // Ensure data-icon is also updated for consistency
                    emojiDialog.destroy();
                }
            });
        });

        const cancelBtn = dialogElement.querySelector(".b3-button--cancel");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                emojiDialog.destroy();
            });
        }
    }
}