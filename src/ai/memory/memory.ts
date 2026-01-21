import { prisma } from "@/lib/prisma";
import { MemoryType } from "@prisma/client";

export async function getUserMemory(userId: string) {
    return prisma.memory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
    });
}

export async function saveMemory(
    userId: string,
    type: MemoryType,
    content: string,
    source?: string
) {
    return prisma.memory.create({
        data: {
            userId,
            type,
            content,
            source,
        },
    });
}
