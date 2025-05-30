import { renderSprig, setCustomAttr, getChildBlocks, deleteBlock } from "./api";

export async function applyTemplaterFunctions(docId: string): Promise<boolean> {
    try {
        const blocks = await getChildBlocks(docId);        
        if (!blocks || !blocks.data || blocks.data.length === 0) {
            // no blocks found, returning false
            return false;
        }   
        const data = blocks.data;   
        const functionBlocks = data.filter((item: { markdown: string | string[]; }) => item.markdown.includes("<%") && item.markdown.includes("%>"));
        for (const funcBl of functionBlocks) {
            const functions = replaceAndSplit(funcBl.markdown);
            for (const func of functions) {
                // Custom Attributes
                const customAttributes = await getCustomAttr(func);
                if (customAttributes) {
                    await setCustomAttr(docId, customAttributes);
                }
                // other Functions...
            }
            // delete block
            await deleteBlock(funcBl.id);
        }
        return true;
    }
    catch(error) {
        console.error("Error processing templater functions:", error);
        return false;
    }
}

export function replaceAndSplit(content: string): string[] {
    // Ignore spaces within {{ and }}
    const ignoreSpacesInCurlyBraces = content.replace(/\{\{(.*?)\}\}/g, match =>
        match.replace(/ /g, "___SPACE___")
    );

    // Ignore spaces within double quotes
    const ignoreSpacesInQuotes = ignoreSpacesInCurlyBraces.replace(/"(.*?)"/g, match =>
        match.replace(/ /g, "___SPACE___")
    );

    // Replace '<%' and '%>' with empty string
    const replaceAngleBrackets = ignoreSpacesInQuotes.replace(/<%|%>/g, "");

    // Split the string by spaces
    const splitBySpaces = replaceAngleBrackets.split(" ");

    // Replace the temporary placeholder back to spaces within the previously identified {{ and }} sections and quotes
    return splitBySpaces.map(item => item.replace(/___SPACE___/g, " "));
}

export async function getCustomAttr(content: string){
    try {
        if (content.startsWith("custom-")){
            const attrs: { [key: string]: string } = {};
            const [key, value] = content.split("=");
            if (key && value) {   
                const formattedKey = await renderSprig(key);
                const formattedValue = await renderSprig(value);         
                attrs[formattedKey] = formattedValue.replace(/"/g, "");
            }
            return attrs;
        }
        else {
            return null;
        }
    }
    catch(error) {
        console.error("Error processing custom attributes:", error);
        return null;
    }
}