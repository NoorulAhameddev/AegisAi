export async function ingestFile(fileId: string, content: string, userId: string) {
    // This helper would split content into chunks and add to vector store
    // This is useful for "Upload PDF" feature in Phase 3
    const { addDocument } = await import("./vector-store");

    // Naively chunk by paragraphs for now
    const chunks = content.split("\n\n").filter(c => c.length > 50);

    for (const chunk of chunks) {
        await addDocument(chunk, { fileId, type: 'document' }, userId);
    }
}
