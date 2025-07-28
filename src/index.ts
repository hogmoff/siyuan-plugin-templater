import {
    Plugin,
    showMessage,
    Dialog,
    Setting,
} from "siyuan";
import "./index.scss";
import { Templater, TemplateRule, getDocumentPathById, DEFAULT_ICON } from "./templater";
import { getDynamicIconUrl, getDynamicIcon, getNotebookNameById } from "./api";

export default class TemplaterPlugin extends Plugin {
    private templater: Templater;
    public setting: Setting;
    private processedDocuments: Set<string> = new Set();
    private pluginPath: string;
    private iconSVG: string[] = [];
    private iconUrl: string[] = [];

    async onload() {
        this.templater = new Templater(this.name, this.i18n);
        this.pluginPath = `/data/plugins/${this.name}`;

        // Add icon for the plugin
        this.addIcons(`<symbol id="iconTemplater" viewBox="0 0 256.000000 256.000000">
<g transform="translate(0.000000,256.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
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

        // Get Notebook ID
        const notebookId = detail.protyle.notebookId;
        if (!notebookId) {
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

            // Get the human-readable name of the notebook to allow notebook-specific rules
            const notebookName = await getNotebookNameById(notebookId);
            if (!notebookName) {
                console.error("Could not determine notebook name for new document.");
                return;
            }

            // Combine notebook name and document path for matching.
            // HdocPath is either empty (for root docs) or starts with a "/".
            const fullPathForMatching = `${notebookName}${HdocPath}`;

            // Find matching template
            const matchedRule = this.templater.findTemplateForPath(fullPathForMatching);

            if (matchedRule) {
                // Add to processed list first to prevent double processing
                this.processedDocuments.add(docId);

                // Apply the template with destination path and icon if specified
                const success = await this.templater.applyTemplate(
                    docId,
                    matchedRule.templateId,
                    matchedRule.destinationPath,
                    matchedRule.icon,
                    matchedRule.iconUrl
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
        btnManageRules.className = "b3-button b3-button--add";
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
    
        // Initialize temporary arrays to hold icon data for the dialog session
        this.iconSVG = rules.map(rule => rule.icon || DEFAULT_ICON);
        this.iconUrl = rules.map(rule => rule.iconUrl || "");
    
        let rulesHTML = "";
        rules.forEach((rule, index) => {
            const escapedDestinationPath = (rule.destinationPath || "").replace(/"/g, "&quot;");
            const iconForDataAttribute = this.escapeHtml(this.iconSVG[index]);
    
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
                            <button class="b3-button b3-button--outline emoji-picker-btn" data-icon="${iconForDataAttribute}">
                                {/* Button content will be set by styleIconContainerButton */}
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Remove Button -->
                <div class="fn__flex" style="margin-top: 8px;">
                    <div class="fn__flex-1"></div>
                    <button class="b3-button b3-button--remove remove-rule">
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
                <div class="template-rules-container" style="max-height: 60vh; overflow-y: auto; padding-right: 5px;">
                    ${rulesHTML}
                </div>
            </div>
            <div class="b3-dialog__action">
                <button class="b3-button b3-button--add">${this.i18n.add}</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--saveDialog">${this.i18n.save}</button>
            </div>`,
            width: "800px",
        });
        const dialogElement = dialog.element;
        const rulesContainer = dialogElement.querySelector(".template-rules-container");

        // Function to handle re-indexing data attributes after a remove operation
        const reindexRuleElements = () => {
            const remainingRuleElements = rulesContainer.querySelectorAll(".template-rule");
            remainingRuleElements.forEach((el, newIdx) => {
                (el as HTMLElement).dataset.index = newIdx.toString();
            });
        };
        
        // Function to attach listener to a remove button
        const attachRemoveListener = (buttonElement: HTMLElement) => {
            buttonElement.addEventListener("click", (e_rm) => {
                const ruleElementToRemove = (e_rm.target as HTMLElement).closest(".template-rule") as HTMLElement;
                const indexToRemove = parseInt(ruleElementToRemove.dataset.index, 10);
                
                ruleElementToRemove.remove();
                
                if (!isNaN(indexToRemove) && indexToRemove < this.iconSVG.length) {
                    this.iconSVG.splice(indexToRemove, 1);
                    this.iconUrl.splice(indexToRemove, 1);
                }
                reindexRuleElements();
            });
        };

        // Style icon buttons for existing rules and attach listeners
        dialogElement.querySelectorAll(".template-rule").forEach(ruleEl => {
            const button = ruleEl.querySelector(".emoji-picker-btn") as HTMLElement;
            const indexStr = (ruleEl as HTMLElement).dataset.index;
        
            if (button && indexStr !== undefined) {
                const index = parseInt(indexStr, 10);
                if (index < this.iconSVG.length) {
                    const iconValue = this.iconSVG[index];
                    this.styleIconContainerButton(button, iconValue);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                button.addEventListener("click", (e) => {
                    this.showEmojiPicker(button);
                });
        
                const removeButton = ruleEl.querySelector(".remove-rule") as HTMLElement;
                if (removeButton) {
                    attachRemoveListener(removeButton);
                }
            }
        });

        // Add event listener for "Add Rule" button
        const addRuleBtn = dialog.element.querySelector(".b3-button--add");
        addRuleBtn.addEventListener("click", () => {
            const currentRuleElements = rulesContainer.querySelectorAll(".template-rule");
            const newIndexInUI = currentRuleElements.length;

            // Add default icon data for the new rule
            this.iconSVG.push(DEFAULT_ICON);
            this.iconUrl.push("");

            const newRuleHTML = `
            <div class="template-rule" data-index="${newIndexInUI}">
                <!-- Path Pattern and Template -->
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
                <!-- Description, Destination Path and Icon -->
                <div class="fn__flex">
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.description}</div>
                        <input class="b3-text-field fn__block description" value="">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-1">
                        <div class="b3-label">${this.i18n.destinationPath}</div>
                        <input class="b3-text-field fn__block destination-path" value="">
                    </div>
                    <div class="fn__space"></div>
                    <div class="fn__flex-0">
                        <div class="b3-label">${this.i18n.icon || "Icon"}</div>
                        <div class="fn__flex">
                            <button class="b3-button b3-button--outline emoji-picker-btn" data-icon="${this.escapeHtml(DEFAULT_ICON)}">
                                {/* Button content will be set by styleIconContainerButton */}
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Remove Button -->
                <div class="fn__flex" style="margin-top: 8px;">
                    <div class="fn__flex-1"></div>
                    <button class="b3-button b3-button--remove remove-rule">
                        ${this.i18n.remove}
                    </button>
                </div>
                <div class="fn__hr"></div>
            </div>`;
            rulesContainer.insertAdjacentHTML("beforeend", newRuleHTML);

            const newRuleElement = rulesContainer.querySelector(`.template-rule[data-index="${newIndexInUI}"]`);
            if (newRuleElement) {
                const newEmojiBtn = newRuleElement.querySelector(".emoji-picker-btn") as HTMLElement;
                if (newEmojiBtn) {
                    this.styleIconContainerButton(newEmojiBtn, DEFAULT_ICON); // Style the new button
                    newEmojiBtn.addEventListener("click", (e) => {
                        this.showEmojiPicker(e.target as HTMLElement);
                    });
                }
                const newRemoveBtn = newRuleElement.querySelector(".remove-rule") as HTMLElement;
                if (newRemoveBtn) {
                    attachRemoveListener(newRemoveBtn);
                }
            }
        });

        // Save Button
        const saveBtn = dialog.element.querySelector(".b3-button--saveDialog");
        saveBtn.addEventListener("click", async () => {
            const ruleElements = rulesContainer.querySelectorAll(".template-rule");
            const newRules: TemplateRule[] = [];

            ruleElements.forEach(el => {
                const ruleElement = el as HTMLElement;
                const index = parseInt(ruleElement.dataset.index, 10);

                const pathPattern = (ruleElement.querySelector(".path-pattern") as HTMLInputElement).value;
                const templateId = (ruleElement.querySelector(".template-id") as HTMLInputElement).value;
                const description = (ruleElement.querySelector(".description") as HTMLInputElement).value;
                const destinationPath = (ruleElement.querySelector(".destination-path") as HTMLInputElement).value;
                
                if (pathPattern && templateId && !isNaN(index) && index < this.iconSVG.length) {
                    newRules.push({
                        pathPattern,
                        templateId,
                        description: description || undefined,
                        destinationPath: destinationPath || undefined,
                        icon: this.iconSVG[index],
                        iconUrl: this.iconUrl[index],  
                    });
                }
            });

            this.templater.setRules(newRules); // Use the setRules method
            await this.templater.saveRules();

            const rulesTableContainerElement = document.querySelector(".templater-rules-table");
            if (rulesTableContainerElement) {
                this.updateRulesTable(rulesTableContainerElement as HTMLElement);
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

    /**
    * Styling Container Buttons
    */
    private styleIconContainerButton(buttonElement: HTMLElement, iconContent: string) {
        buttonElement.style.width = "32px";
        buttonElement.style.height = "32px";
        buttonElement.style.overflow = "hidden";
        buttonElement.style.display = "flex";
        buttonElement.style.alignItems = "center";
        buttonElement.style.justifyContent = "center";
        buttonElement.style.flexShrink = "0";

        if (iconContent && iconContent.trim().startsWith("<svg")) {
            buttonElement.innerHTML = iconContent; // Set raw SVG content
            buttonElement.style.padding = "0";  
            buttonElement.style.lineHeight = "1"; 

            const svgEl = buttonElement.querySelector("svg");
            if (svgEl) {
                svgEl.style.width = "100%";
                svgEl.style.height = "100%";
                svgEl.removeAttribute("width");
                svgEl.removeAttribute("height");
                if (!svgEl.hasAttribute("preserveAspectRatio")) {
                    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
                }
            }
        } else {
            // For Emojis or Text-Icons
            buttonElement.textContent = iconContent; // Emoji as text setzen
            buttonElement.style.padding = "0 8px";   // Standard-Padding für Text-Icons
            buttonElement.style.lineHeight = "32px"; // Standard-Zeilenhöhe
        }
    }

    private escapeHtml(unsafe: string): string {
        if (unsafe === null || unsafe === undefined) return "";
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private showEmojiPicker(buttonElement: HTMLElement) {
        // Find the closest rule element to the clicked button
        const ruleElement = buttonElement.closest(".template-rule") as HTMLElement;
        if (!ruleElement) return;
        
        const ruleIndex = parseInt(ruleElement.dataset.index, 10);
        if (isNaN(ruleIndex) || ruleIndex >= this.iconSVG.length) { // Ensure ruleIndex is valid for current arrays
            console.error("Invalid ruleIndex in showEmojiPicker:", ruleIndex);
            return;
        }
        
        // Access Siyuan's global emoji data
        const emojiCategories = (window as any).siyuan && (window as any).siyuan.emojis;
        
        if (!emojiCategories || !Array.isArray(emojiCategories) || emojiCategories.length === 0) {
            console.error("Siyuan emoji data not found, empty, or not an array.");
            showMessage(this.i18n.emojiLoadError || "Could not load Siyuan emojis.", 3000, "error");
            
            const errorDialog = new Dialog({
                title: this.i18n.selectIcon || "Select Icon",
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
    
        const getCategoryTitle = (category: any) => {
            const lang = (window as any).siyuan && (window as any).siyuan.config && (window as any).siyuan.config.lang;
            if (lang === "ja_JP" && category.title_ja_jp) return category.title_ja_jp;
            if (lang === "zh_CN" && category.title_zh_cn) return category.title_zh_cn;
            return category.title || category.id;
        };
    
        const getEmojiChar = (unicode: string): string => {
            if (!unicode || typeof unicode !== "string") return "?";
            try {
                return unicode.split("-").map(hex => String.fromCodePoint(parseInt(hex, 16))).join("");
            } catch (e) {
                console.error(`Error converting unicode ${unicode} to char:`, e);
                return "?";
            }
        };
    
        // --- EMOJI TAB HTML ---
        let emojiPickerHTML = `
            <input type="text" class="b3-text-field fn__block emoji-filter-input" placeholder="${this.i18n.filterEmoji || "Filter emojis..."}" style="margin-bottom: 8px;">
            <div class="emoji-picker-list" style="max-height: 300px; overflow-y: auto;">
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
                    const descriptionJaJp = emoji.description_ja_jp || "";
                    const descriptionZhCn = emoji.description_zh_cn || "";
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
    
        // --- DYNAMIC ICON TAB HTML ---
        const defaultDynamicIconParams = {
            color: "#f3a92f",
            lang: (window as any).siyuan?.config?.lang || "en_US",
            weekdayType: "2",
            type: "1",
            content: "SiYuan"
        };
    
        // Find the section where the dynamic icon form HTML is defined and modify it
        const dynamicIconFormHTML = `
        <div class="b3-form__item">
            <label class="b3-label">${this.i18n.dynamicIconColor || "Color"}:</label>
            <input type="color" id="dynamic-icon-color" class="b3-text-field" value="${defaultDynamicIconParams.color}">
        </div>
        <div class="b3-form__item">
            <label class="b3-label">${this.i18n.dynamicIconLang || "Language"}:</label>
            <select id="dynamic-icon-lang" class="b3-select">
                <option value="en_US" ${defaultDynamicIconParams.lang === "en_US" ? "selected" : ""}>English</option>
                <option value="zh_CN" ${defaultDynamicIconParams.lang === "zh_CN" ? "selected" : ""}>简体中文</option>
                <option value="ja_JP" ${defaultDynamicIconParams.lang === "ja_JP" ? "selected" : ""}>日本語</option>
                <option value="de_DE" ${defaultDynamicIconParams.lang === "de_DE" ? "selected" : ""}>Deutsch</option>
            </select>
        </div>
        <div class="b3-form__item">
            <label class="b3-label">${this.i18n.dynamicIconDate || "Date"}:</label>
            <input type="date" id="dynamic-icon-date" class="b3-text-field" value="">
        </div>
        <div class="b3-form__item">
            <label class="b3-label">${this.i18n.dynamicIconWeekdayType || "Weekday Start"}:</label>
            <select id="dynamic-icon-weekdayType" class="b3-select">
                <option value="1">${this.i18n.weekdaySunday || "Sunday"}</option>
                <option value="2" selected>${this.i18n.weekdayMonday || "Monday"}</option>
            </select>
        </div>
        <div class="b3-form__item">
            <label class="b3-label">${this.i18n.dynamicIconType || "Icon Type"}:</label>
            <select id="dynamic-icon-type" class="b3-select">
                <option value="1" selected>${this.i18n.typeFullDate || "Full Date"}</option>
                <option value="2">${this.i18n.typeDate || "Date"}</option>
                <option value="3">${this.i18n.typeMonth || "Month"}</option>
                <option value="4">${this.i18n.typeYear || "Year"}</option>
                <option value="5">${this.i18n.typeWeek || "Week"}</option>
                <option value="6">${this.i18n.typeWeekday || "Weekday"}</option>
                <option value="7">${this.i18n.typeDayCount || "Day Count"}</option>
                <option value="8">${this.i18n.typeCustomText || "Custom Text"}</option>
            </select>
        </div>
        <div class="b3-form__item" id="dynamic-icon-content-wrapper" style="${defaultDynamicIconParams.type !== "8" ? "display: none;" : ""}">
            <label class="b3-label">${this.i18n.dynamicIconContent || "Content"}:</label>
            <input type="text" id="dynamic-icon-content" class="b3-text-field" value="${defaultDynamicIconParams.content}">
        </div>
        <div class="fn__flex">
            <div id="dynamic-icon-preview" style="width: 96px; height: 96px;">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
                <text x="10" y="20" font-family="Arial" font-size="12" fill="black">Icon</text>
                </svg>
            </div>
            <div class="fn__flex-1" style="margin-left: 4px;">
                <div class="b3-label">${this.i18n.dynamicIconUrl || "Icon URL"}:</div>
                <code id="dynamic-icon-url" style="display: block; font-size: 11px; max-height: 80px; overflow-y: auto; word-break: break-all; white-space: pre-wrap;"></code>
            </div>
        </div>`;

        // Dialog
        const dialogContent = `
        <div class="b3-dialog__content">
        <div class="templater-tabs" style="margin-bottom: 16px; border-bottom: 1px solid var(--b3-border-color); display: flex;">
            <div class="templater-tab templater-tab--active" data-tab-id="emojis" style="padding: 8px 16px; cursor: pointer; position: relative; font-weight: 500;">
            ${this.i18n.emojis || "Emojis"}
            <div class="templater-tab-indicator" style="position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background-color: var(--b3-theme-primary);"></div>
            </div>
            <div class="templater-tab" data-tab-id="dynamic" style="padding: 8px 16px; cursor: pointer; position: relative; font-weight: 500;">
            ${this.i18n.dynamicIcons || "Dynamic Icons"}
            <div class="templater-tab-indicator" style="position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background-color: var(--b3-theme-primary); display: none;"></div>
            </div>
        </div>
        <div id="tab-content-emojis" class="tab-content templater-tab-content--active">
            ${emojiPickerHTML}
        </div>
        <div id="tab-content-dynamic" class="tab-content" style="display: none; max-height: 400px; overflow-y: auto; padding-right: 5px;">
            ${dynamicIconFormHTML}
        </div>
        </div>
        <div class="b3-dialog__action">
        <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
        <div class="fn__space"></div>
        <button class="b3-button b3-button--save" id="apply-dynamic-icon">${this.i18n.apply || "Apply"}</button>
        </div>
        `;
    
        const mainDialog = new Dialog({
            title: this.i18n.selectIcon || "Select Icon",
            content: dialogContent,
            width: "420px",
        });
    
        const dialogElement = mainDialog.element;
    
        // --- TAB SWITCHING LOGIC ---
        const tabs = dialogElement.querySelectorAll(".templater-tab");
        const tabContents = dialogElement.querySelectorAll(".tab-content");
        tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Remove active state from all tabs
            tabs.forEach(t => {
            t.classList.remove("templater-tab--active");
            const indicator = t.querySelector(".templater-tab-indicator") as HTMLElement;
            if (indicator) indicator.style.display = "none";
            });
            
            // Add active state to clicked tab
            tab.classList.add("templater-tab--active");
            const indicator = tab.querySelector(".templater-tab-indicator") as HTMLElement;
            if (indicator) indicator.style.display = "block";
            
            // Show corresponding content
            const tabId = tab.getAttribute("data-tab-id");
            tabContents.forEach(content => {
            const contentEl = content as HTMLElement;
            if (contentEl.id === `tab-content-${tabId}`) {
                contentEl.style.display = "";
                contentEl.classList.add("templater-tab-content--active");
            } else {
                contentEl.style.display = "none";
                contentEl.classList.remove("templater-tab-content--active");
            }
            });
        });
        });
    
        // --- EMOJI TAB LOGIC ---
        const filterInput = dialogElement.querySelector(".emoji-filter-input") as HTMLInputElement;
        const emojiCategoriesElements = dialogElement.querySelectorAll(".emoji-category");
    
        if (filterInput) {
            filterInput.style.borderRadius = "4px";
            filterInput.style.padding = "8px 12px";
            filterInput.style.backgroundColor = "var(--b3-theme-background-light, #f5f5f5)";
            filterInput.style.border = "1px solid var(--b3-border-color)";
            filterInput.style.marginBottom = "12px";
            filterInput.placeholder = this.i18n.filterEmoji || "Filter emojis...";
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
                    (categoryEl as HTMLElement).style.display = categoryHasVisibleEmojis ? "" : "none";
                });
            });
        }
    
        const emojiButtons = dialogElement.querySelectorAll(".emoji-btn");
        let selectedEmoji: string | null = null;

        emojiButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Remove selection from all emoji buttons
            emojiButtons.forEach(b => b.classList.remove("emoji-btn--selected"));
            
            // Add selection to clicked button
            btn.classList.add("emoji-btn--selected");
            
            // Store the selected emoji
            selectedEmoji = btn.getAttribute("data-emoji");
            
            // Preview the emoji in the button
            if (selectedEmoji) {
            // Just preview, don't apply yet
            const previewButton = buttonElement.cloneNode(true) as HTMLElement;
            this.styleIconContainerButton(previewButton, selectedEmoji);
            
            // Show a preview somewhere in the dialog
            const previewArea = dialogElement.querySelector("#emoji-preview-area") || 
                (() => {
                const area = document.createElement("div");
                area.id = "emoji-preview-area";
                area.style.textAlign = "center";
                area.style.marginTop = "10px";
                area.innerHTML = `<div class="b3-label">${this.i18n.preview || "Preview"}</div>`;
                const container = document.createElement("div");
                container.style.display = "inline-block";
                container.style.margin = "10px auto";
                area.appendChild(container);
                
                const emojiTab = dialogElement.querySelector("#tab-content-emojis");
                if (emojiTab) emojiTab.appendChild(area);
                return area;
                })();
            
            const container = previewArea.querySelector("div");
            if (container) {
                container.innerHTML = "";
                const clone = previewButton.cloneNode(true) as HTMLElement;
                clone.style.width = "48px";
                clone.style.height = "48px";
                container.appendChild(clone);
            }
            }
        });
        });
    
        // --- DYNAMIC ICON TAB LOGIC ---
        const dynamicColorInput = dialogElement.querySelector("#dynamic-icon-color") as HTMLInputElement;
        const dynamicLangSelect = dialogElement.querySelector("#dynamic-icon-lang") as HTMLSelectElement;
        const dynamicDateInput = dialogElement.querySelector("#dynamic-icon-date") as HTMLInputElement;
        const dynamicWeekdayTypeSelect = dialogElement.querySelector("#dynamic-icon-weekdayType") as HTMLSelectElement;
        const dynamicTypeSelect = dialogElement.querySelector("#dynamic-icon-type") as HTMLSelectElement;
        const dynamicContentInput = dialogElement.querySelector("#dynamic-icon-content") as HTMLInputElement;
        const dynamicContentWrapper = dialogElement.querySelector("#dynamic-icon-content-wrapper") as HTMLElement;
        const applyDynamicIconButton = dialogElement.querySelector("#apply-dynamic-icon") as HTMLButtonElement;
        const dynamicIconPreview = dialogElement.querySelector("#dynamic-icon-preview") as HTMLElement;
        const dynamicIconUrl = dialogElement.querySelector("#dynamic-icon-url") as HTMLElement;
        let color: string;
        let lang: string;
        let date: string;
        let weekdayType: string;
        let content: string;
        let type: string;
    
        const updateDynamicIconPreview = async () => {
            color = dynamicColorInput.value || "";
            lang = dynamicLangSelect.value || "";
            type = dynamicTypeSelect.value || "";
            date = dynamicDateInput.value || "";
            weekdayType = dynamicWeekdayTypeSelect.value || "";
            content = dynamicContentInput.value || "";
    
            // Show/hide content input based on type
            if (dynamicContentWrapper) {
                dynamicContentWrapper.style.display = type === "8" ? "" : "none";
            }
    
            // Generate the dynamic icon URL
            const dynamicIconUrlValue = getDynamicIconUrl(color, lang, date, weekdayType, type, content);
            if (dynamicIconUrlValue) {
                dynamicIconUrl.textContent = dynamicIconUrlValue;
                const dynamicIcon = await getDynamicIcon(dynamicIconUrlValue);
                if (dynamicIcon) {
                    dynamicIconPreview.innerHTML = dynamicIcon;
                }
            }
        };
    
        [dynamicColorInput, dynamicLangSelect, dynamicDateInput, dynamicWeekdayTypeSelect, dynamicTypeSelect, dynamicContentInput].forEach(el => {
            if (el) el.addEventListener("input", updateDynamicIconPreview);
            if (el && el.tagName === "SELECT") el.addEventListener("change", updateDynamicIconPreview);
        });
        updateDynamicIconPreview(); // Initial preview
    
        if (applyDynamicIconButton) {
            applyDynamicIconButton.addEventListener("click", async () => {
                // Check which tab is active
                const isEmojiTabActive = dialogElement.querySelector(".templater-tab[data-tab-id='emojis']")?.classList.contains("templater-tab--active");
                
                if (isEmojiTabActive && selectedEmoji) {
                // Apply the selected emoji
                this.iconSVG[ruleIndex] = selectedEmoji;
                this.iconUrl[ruleIndex] = ""; // Emojis don't have a URL
                
                buttonElement.setAttribute("data-icon", selectedEmoji);
                this.styleIconContainerButton(buttonElement, selectedEmoji);
                
                showMessage(this.i18n.iconUpdated || "Icon updated successfully", 3000, "info");
                mainDialog.destroy();
                } else {
                // Existing dynamic icon logic
                const currentDynamicColor = (dialogElement.querySelector("#dynamic-icon-color") as HTMLInputElement).value;
                const currentDynamicLang = (dialogElement.querySelector("#dynamic-icon-lang") as HTMLSelectElement).value;
                const currentDynamicDate = (dialogElement.querySelector("#dynamic-icon-date") as HTMLInputElement).value;
                const currentDynamicWeekdayType = (dialogElement.querySelector("#dynamic-icon-weekdayType") as HTMLSelectElement).value;
                const currentDynamicType = (dialogElement.querySelector("#dynamic-icon-type") as HTMLSelectElement).value;
                const currentDynamicContent = (dialogElement.querySelector("#dynamic-icon-content") as HTMLInputElement).value;
                
                const dynamicIconUrlValue = getDynamicIconUrl(
                    currentDynamicColor, 
                    currentDynamicLang, 
                    currentDynamicDate, 
                    currentDynamicWeekdayType, 
                    currentDynamicType, 
                    currentDynamicContent
                );
                
                if (dynamicIconUrlValue) {
                    try {
                    const dynamicIconSVG = await getDynamicIcon(dynamicIconUrlValue);
                    if (dynamicIconSVG) {
                        // Update the central icon arrays for this rule's index
                        this.iconSVG[ruleIndex] = dynamicIconSVG;
                        this.iconUrl[ruleIndex] = dynamicIconUrlValue;
                        
                        // Update button's data attribute and appearance
                        buttonElement.setAttribute("data-icon", this.escapeHtml(dynamicIconSVG));
                        this.styleIconContainerButton(buttonElement, dynamicIconSVG);
                        
                        // Show success message
                        showMessage(this.i18n.iconUpdated || "Icon updated successfully", 3000, "info");
                        mainDialog.destroy();
                    } else {
                        showMessage(this.i18n.dynamicIconLoadFailed || "Failed to load dynamic icon.", 3000, "error");
                    }
                    } catch (error) {
                    console.error("Error loading dynamic icon:", error);
                    showMessage(this.i18n.dynamicIconLoadFailed || "Failed to load dynamic icon.", 3000, "error");
                    }
                }
                }
            });
        }
    
        // --- CANCEL BUTTON ---
        const cancelBtn = dialogElement.querySelector(".b3-button--cancel");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                mainDialog.destroy();
            });
        }
    }    
}
