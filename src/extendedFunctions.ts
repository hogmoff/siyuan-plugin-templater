import { renderSprig, setCustomAttr } from "./api";

export async function applyTemplaterFunctions(docId: string, content:string): Promise<boolean> {
    try {
        const functions = getTemplaterFunctions(content);
        for (const func of functions) {
            // Custom Attributes
            const customAttributes = await getCustomAttr(func);
            if (customAttributes) {
                await setCustomAttr(docId, customAttributes);
            }
            // Other possible Functions ...
        }
        return true;
    }
    catch(error) {
        console.error("Error processing templater functions:", error);
        return false;
    }
}

export function getTemplaterFunctions(content: string): string[] {
    const rows = content.split("\n")
        .filter((row: string) => row.trim().startsWith("{{.templater"))
        .map((row: string) => {
            // Remove {{.templater and }} from row
            const start = row.indexOf("{{.templater") + "{{.templater".length;
            const end = row.lastIndexOf("}}");
            return row.substring(start, end).trim();
        });

    return rows;
}

export async function getCustomAttr(content: string){
    try {
        if (content.startsWith("custom-")){
            const attrs: { [key: string]: string } = {};
            const [key, value] = content.split("=");
            if (key && value) {   
                const formattedKey = await renderSprig(key);
                const formattedValue = await renderSprig(value);         
                attrs[formattedKey] = formattedValue;
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