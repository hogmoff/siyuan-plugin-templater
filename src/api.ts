import { IWebSocketData, IObject, fetchGet, fetchSyncPost } from "siyuan";

// async function request(url: string, data: any) {
//     const response: IWebSocketData = await fetchSyncPost(url, data);
//     const res = response.code === 0 ? response.data : null;
//     return res;
// }

export async function getWorkspaceDir(): Promise<any> {
    const data = {};
    const url = "/api/system/getWorkspaces";
    try {
        const file = await fetchSyncPost(url, data);
        const d = file.data[0];
        return d.path;
    } catch (error_msg) {
        return null;
    }
}

/**
 * Gets the notebook ID for a document using kernel API
 * @param docId The document ID
 * @returns The notebook ID or null if not found
 */
export async function getNotebookIdByDocId(docId: string): Promise<any> {
    const data = {
        stmt: `SELECT box FROM blocks WHERE id = '${docId}' LIMIT 1`
    };
    const url = "/api/query/sql";
    try {
        const notebook = await fetchSyncPost(url, data);
        return notebook.data[0].box;
    } catch (error_msg) {
        console.error(error_msg);
        return null;
    }
}

export async function createDocWithMd(notebook: string, path: string, markDown: string): Promise<any> {
    const data = {
        notebook: notebook,
        path: path,
        markdown: markDown
    };
    const url = "/api/filetree/createDocWithMd";
    try {
        const file = await fetchSyncPost(url, data);
        return file.data;
    } catch (error_msg) {
        return null;
    }
}

export async function renameDoc(notebook: string, path: string, newTitle: string): Promise<any> {
    const data = {
        notebook: notebook,
        path: path,
        title: newTitle
    };
    const url = "/api/filetree/renameDoc";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export async function renameDocbyId(docId: string, newTitle: string): Promise<any> {
    const data = {
        id: docId,
        title: newTitle
    };
    const url = "/api/filetree/renameDocByID";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export async function moveDocbyId(docId: string, newPath: string, notebookId: string, newPathDocId?: string): Promise<any> {
    let toPath = null;
    if (!newPathDocId) {
        toPath = await getIDsByHPath(notebookId, newPath); 
    }
    else {
        toPath = [newPathDocId];
    }    
    if (!toPath || toPath.length == 0) return null;

    const data = {
        fromIDs: [docId],
        toID: toPath[0]
    };
    const url = "/api/filetree/moveDocsByID";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
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

export async function getPathbyID(Id: string): Promise<any> {
    const data = {
        id: Id
    };
    const url = "/api/filetree/getPathByID";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export async function getHPathByID(Id: string): Promise<any> {
    const data = {
        id: Id
    };
    const url = "/api/filetree/getHPathByID";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export async function getIDsByHPath(notebookId: string, Path: string): Promise<any> {
    const data = {
        path: Path,
        notebook: notebookId
    };
    const url = "/api/filetree/getIDsByHPath";
    try {
        const fileList = await fetchSyncPost(url, data);
        return fileList.data;
    } catch (error_msg) {
        return null;
    }
}

export async function renderSprig(template: string): Promise<any> {
    const data = {
        "template": template
    };
    const url = "/api/template/renderSprig";
    try {
        const sprig = await fetchSyncPost(url, data);
        return sprig["data"];
    } catch (error_msg) {
        return null;
    }
}

export async function renderTemplate(Id: string, Path: string): Promise<any> {
    const data = {
        id: Id,
        path: Path
    };
    const url = "/api/template/render";
    try {
        const response = await fetchSyncPost(url, data);
        
        if (!response) {
            console.error("Empty response received");
            return null;
        }
        
        if (response.code !== 0) {
            console.error("Template rendering failed:", response.msg || "Unknown error");
            return null;
        }
        
        return response.data;
    } catch (error_msg) {
        console.error("Error rendering template:", error_msg, "with data:", data);
        return null;
    }
}

export function getDynamicIconUrl(
    color: string,
    lang: string,
    date: string,
    weekdayType: string,
    type: string,
    content: string
): string { 
    const params = new URLSearchParams();
    params.append("color", color);
    params.append("lang", lang);
    params.append("date", date);
    params.append("weekdayType", weekdayType);
    params.append("type", type);
    params.append("content", content);

    const url = `/api/icon/getDynamicIcon?${params.toString()}`;
    return url;

}

export async function getDynamicIcon(url: string): Promise<string | null> {

    try {
        const iconData = await new Promise<string | null>((resolve, reject) => {
            fetchGet(url, (responseData: IWebSocketData | IObject | string) => {
                if (typeof responseData === "string") {
                    resolve(responseData);
                } else {
                    console.warn(`Dynamic icon API returned non-string data. Type: ${typeof responseData}`, responseData);
                    resolve(null);
                }
            });
        });

        if (!iconData) {
            console.log("Dynamic icon fetch returned null (e.g., non-string response or timeout).");
        }
        return iconData;

    } catch (error_msg) {
        console.error("Error fetching dynamic icon (Promise rejected):", error_msg);
        return null;
    }
}

export async function setIcon(docId: string, icon: string, iconUrl: string): Promise<any> {
    // If icon is already a string like "1F4C1", keep it as is
    // If it"s an emoji character, convert it to its code point representation
    let formattedIcon = icon;

    if (iconUrl.length === 0){
        // Check if the icon is an emoji (surrogate pair)
        if (icon.length === 1 || (icon.length === 2 && icon.codePointAt(0) > 0xFFFF)) {
            // Convert emoji to its code point string representation
            const codePoint = icon.codePointAt(0);
            formattedIcon = codePoint.toString(16).toUpperCase();
        } else {
            // Clean up the string format if it's already a code point string
            formattedIcon = icon.replace(/^0x/, "").toUpperCase().replace(/"/g, "");
        }
    }
    else {
        formattedIcon = iconUrl.substring(1);
        // Replace date=& with date from today
        formattedIcon = formattedIcon.replace(/date=&/, `date=${new Date().toISOString().split("T")[0]}&`);
    }

    const data = {
        id: docId,
        attrs: { 
            icon: formattedIcon
        }
    };    
    const url = "/api/attr/setBlockAttrs";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export async function getChildBlocks(docId: string): Promise<any> {
    const data = {
        id: docId
    };
    const url = "/api/block/getChildBlocks";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export async function insertBlock(parentId: string, previousId: string, nextId: string, Data: any): Promise<any> {
    const data = {
        dataType: "dom",
        data: Data,
        parentID: parentId,
        previousID: previousId,
        nextID: nextId
    };
    const url = "/api/block/insertBlock";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}

export async function deleteBlock(blockId: string): Promise<any> {
    const data = {
        id: blockId
    };
    const url = "/api/block/deleteBlock";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}