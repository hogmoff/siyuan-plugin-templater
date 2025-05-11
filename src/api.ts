import { Plugin, fetchSyncPost } from "siyuan";

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
        stmt: `SELECT box FROM blocks WHERE id = '${docId}' AND type = 'd' LIMIT 1`
    };
    const url = "/api/query/sql";
    try {
        const file = await fetchSyncPost(url, data);
        const d = file.data[0];
        return d.box;
    } catch (error_msg) {
        console.error(error_msg);
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

export async function renderTemplate(Id: string, Path: string): Promise<any> {
    const data = {
        id: Id,
        path: Path
    };
    const url = "/api/template/render";
    try {
        console.log("Rendering template with data:", data);
        const response = await fetchSyncPost(url, data);
        console.log("Raw response:", response);
        
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
    console.log("Inserting block with data:", data);
    const url = "/api/block/insertBlock";
    try {
        const file = await fetchSyncPost(url, data);
        return file;
    } catch (error_msg) {
        return null;
    }
}