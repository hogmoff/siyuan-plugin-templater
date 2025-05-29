import {
    Plugin,
    showMessage,
    Dialog,
    Setting,
} from "siyuan";
import "./index.scss";
import { Templater, TemplateRule, getDocumentPathById, DEFAULT_ICON } from "./templater";
import { getDynamicIconUrl, getDynamicIcon } from "./api";

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
                            <button class="b3-button b3-button--outline emoji-picker-btn" data-icon="">
                            </button>
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
        const dialogElement = dialog.element;

        dialogElement.querySelectorAll(".template-rule .emoji-picker-btn").forEach(btn => {
            const button = btn as HTMLElement;
            const ruleElement = button.closest(".template-rule");
            if (ruleElement) {
                const iconInput = ruleElement.querySelector(".icon") as HTMLInputElement;
                if (iconInput) {
                    this.styleIconContainerButton(button, iconInput.value);
                }
            }
            // Event listener für Emoji Picker hier hinzufügen (wie gehabt)
            button.addEventListener("click", (e) => {
                this.showEmojiPicker(e.target as HTMLElement);
            });
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
                                <button class="b3-button b3-button--outline emoji-picker-btn" data-icon="${DEFAULT_ICON}" style="width: 32px; padding: 0 8px; height: 32px; line-height: 32px;">${DEFAULT_ICON}</button>
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
            const newEmojiBtn = container.querySelector(`.template-rule[data-index="${newIndex}"] .emoji-picker-btn`) as HTMLElement;
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
                
                if (pathPattern && templateId) {
                    newRules.push({
                        pathPattern,
                        templateId,
                        description: description || undefined,
                        destinationPath: destinationPath || undefined,
                        icon: this.iconSVG[newRules.length],
                        iconUrl: this.iconUrl[newRules.length],
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
            //buttonElement.innerHTML = iconContent;
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
            // Für Emojis oder Text-Icons
            buttonElement.textContent = iconContent; // Emoji als Text setzen
            buttonElement.style.padding = "0 8px";   // Standard-Padding für Text-Icons
            buttonElement.style.lineHeight = "32px"; // Standard-Zeilenhöhe
        }
    }

    private escapeHtml(unsafe: string): string {
        if (unsafe === null || unsafe === undefined) return "";
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, '"')
             .replace(/'/g, "'");
    }

    private showEmojiPicker(buttonElement: HTMLElement) {
        const ruleElement = buttonElement.closest(".template-rule");
        if (!ruleElement) return; // Should not happen
    
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
    
        const dynamicIconFormHTML = `
            <div class="b3-form__item">
                <label class="b3-label">${this.i18n.dynamicIconColor || "Color"}:</label>
                <input type="color" id="dynamic-icon-color" class="b3-text-field" value="${defaultDynamicIconParams.color}">
            </div>
            <div class="b3-form__item">
                <label class="b3-label">${this.i18n.dynamicIconLang || "Language"}:</label>
                <select id="dynamic-icon-lang" class="b3-select">
                    <option value="en_US" ${defaultDynamicIconParams.lang === "en_US" ? "selected" : ""}>English (US)</option>
                    <option value="zh_CN" ${defaultDynamicIconParams.lang === "zh_CN" ? "selected" : ""}>简体中文</option>
                    <option value="ja_JP" ${defaultDynamicIconParams.lang === "ja_JP" ? "selected" : ""}>日本語</option>
                    <option value="de_DE" ${defaultDynamicIconParams.lang === "de_DE" ? "selected" : ""}>Deutsch</option>
                    {/* Add more languages as needed */}
                </select>
            </div>
            <div class="b3-form__item">
                <label class="b3-label">${this.i18n.dynamicIconDate || "Date"}:</label>
                <input type="date" id="dynamic-icon-date" class="b3-text-field" value="">
            </div>
            <div class="b3-form__item">
                <label class="b3-label">${this.i18n.dynamicIconWeekdayType || "Weekday Start"}:</label>
                <select id="dynamic-icon-weekdayType" class="b3-select">
                    <option value="1" ${defaultDynamicIconParams.weekdayType === "1" ? "selected" : ""}>${this.i18n.weekdaySunday || "Sunday"}</option>
                    <option value="2" ${defaultDynamicIconParams.weekdayType === "2" ? "selected" : ""}>${this.i18n.weekdayMonday || "Monday"}</option>
                </select>
            </div>
            <div class="b3-form__item">
                <label class="b3-label">${this.i18n.dynamicIconType || "Icon Type"}:</label>
                <select id="dynamic-icon-type" class="b3-select">
                    <option value="1" ${defaultDynamicIconParams.type === "1" ? "selected" : ""}>${this.i18n.typeDate || "Date"}</option>
                    <option value="2" ${defaultDynamicIconParams.type === "2" ? "selected" : ""}>${this.i18n.typeWeekday || "Weekday"}</option>
                    <option value="3" ${defaultDynamicIconParams.type === "3" ? "selected" : ""}>${this.i18n.typeCustomText || "Custom Text"}</option>
                </select>
            </div>
            <div class="b3-form__item" id="dynamic-icon-content-wrapper" style="${defaultDynamicIconParams.type !== "3" ? "display: none;" : ""}">
                <label class="b3-label">${this.i18n.dynamicIconContent || "Custom Content"}:</label>
                <input type="text" id="dynamic-icon-content" class="b3-text-field" value="${defaultDynamicIconParams.content}">
            </div>
            <div class="b3-form__item">
                <div id="dynamic-icon-preview" style="display: block; margin-top: 8px; padding: 5px; background-color: var(--b3-theme-surface-lighter); border-radius: var(--b3-border-radius-b); width: 128px; height: 128px;">
                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
                        <text x="10" y="20" font-family="Arial" font-size="12" fill="black">Icon</text>
                    </svg>
                </div>
            </div>
            <div class="b3-form__item">
                <code id="dynamic-icon-url" style="display: block; margin-top: 8px; padding: 5px; background-color: var(--b3-theme-surface-lighter); border-radius: var(--b3-border-radius-b); white-space: pre-wrap; word-break: break-all;"></code>
            </div>
            <div class="b3-form__item">
                <button class="b3-button b3-button--primary fn__block" id="apply-dynamic-icon">${this.i18n.apply || "Apply"}</button>
            </div>
        `;
    
        // --- DIALOG STRUCTURE WITH TABS ---
        const dialogContent = `
            <div class="b3-dialog__content">
                <div class="b3-tab-bar" style="margin-bottom: 10px;">
                    <div class="b3-tab b3-tab--active" data-tab-id="emojis">${this.i18n.emojis || "Emojis"}</div>
                    <div class="b3-tab" data-tab-id="dynamic">${this.i18n.dynamicIcons || "Dynamic Icons"}</div>
                </div>
                <div id="tab-content-emojis" class="tab-content b3-tab-content--active">
                    ${emojiPickerHTML}
                </div>
                <div id="tab-content-dynamic" class="tab-content" style="display: none; max-height: 400px; overflow-y: auto; padding-right: 5px;">
                    ${dynamicIconFormHTML}
                </div>
            </div>
            <div class="b3-dialog__action">
                <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
            </div>
        `;
    
        const mainDialog = new Dialog({
            title: this.i18n.selectIcon || "Select Icon",
            content: dialogContent,
            width: "480px", // Adjusted width for more content
        });
    
        const dialogElement = mainDialog.element;
    
        // --- TAB SWITCHING LOGIC ---
        const tabs = dialogElement.querySelectorAll(".b3-tab");
        const tabContents = dialogElement.querySelectorAll(".tab-content");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("b3-tab--active"));
                tab.classList.add("b3-tab--active");
    
                const tabId = tab.getAttribute("data-tab-id");
                tabContents.forEach(content => {
                    const contentEl = content as HTMLElement;
                    if (contentEl.id === `tab-content-${tabId}`) {
                        contentEl.style.display = "";
                        contentEl.classList.add("b3-tab-content--active"); // If Siyuan uses this for styling
                    } else {
                        contentEl.style.display = "none";
                        contentEl.classList.remove("b3-tab-content--active");
                    }
                });
            });
        });
    
        // --- EMOJI TAB LOGIC ---
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
                    (categoryEl as HTMLElement).style.display = categoryHasVisibleEmojis ? "" : "none";
                });
            });
        }
    
        const emojiButtons = dialogElement.querySelectorAll(".emoji-btn");
        emojiButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const emoji = btn.getAttribute("data-emoji");
                if (emoji) {
                    this.iconSVG.push(emoji);
                    this.iconUrl.push("");
                    buttonElement.textContent = emoji;
                    buttonElement.setAttribute("data-icon", emoji);
                    mainDialog.destroy();
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
                dynamicContentWrapper.style.display = type === "3" ? "" : "none";
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
                const dynamicIconUrlValue = getDynamicIconUrl(color, lang, date, weekdayType, type, content);
                if (dynamicIconUrlValue) {
                    const dynamicIconSVG = await getDynamicIcon(dynamicIconUrlValue);
                    dynamicIconPreview.textContent = dynamicIconSVG;

                    this.iconSVG = [dynamicIconSVG];
                    this.iconUrl = [dynamicIconUrlValue];

                    buttonElement.textContent = "DI";
                    buttonElement.setAttribute("data-icon", dynamicIconSVG);

                    if (dynamicIconSVG && dynamicIconSVG.trim().startsWith("<svg")) {
                        buttonElement.innerHTML = dynamicIconSVG;
                        // Ggf. Styling anpassen, falls das SVG zu groß ist
                        // buttonElement.style.padding = "0";
                    } else {
                        buttonElement.textContent = "DI";
                    }
                    buttonElement.setAttribute("data-icon", dynamicIconSVG);

                    mainDialog.destroy();
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
