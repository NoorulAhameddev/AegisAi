/**
 * Character System Tests
 * Test character CRUD, permissions, and chat integration
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { prisma } from "@/lib/prisma";
import {
  getCharacterPresets,
  getCharacterById,
  createCharacterPreset,
  updateCharacterPreset,
  deleteCharacterPreset,
  getPopularCharacters,
} from "@/services/characters/character-service";
import {
  buildCharacterPrompt,
  getCharacterConfig,
  canUserAccessCharacter,
} from "@/services/characters/prompt-builder";

describe("Character Service", () => {
  let userId: string;
  let characterId: string;
  let systemCharacterId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-char-${Date.now()}@example.com`,
        password: "hashed_password",
        name: "Test User",
        plan: "FREE",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.character.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  describe("createCharacterPreset", () => {
    it("should create a user-owned character preset", async () => {
      const character = await createCharacterPreset(
        {
          name: "Python Expert",
          description: "Specializes in Python programming",
          avatar: "🐍",
          systemPrompt: "You are a Python expert...",
          temperature: 0.6,
          category: "Coding",
          tags: ["python", "coding"],
        },
        userId,
      );

      expect(character.name).toBe("Python Expert");
      expect(character.userId).toBe(userId);
      expect(character.isSystem).toBe(false);
      expect(character.isActive).toBe(true);

      characterId = character.id;
    });

    it("should enforce free tier character limit (3)", async () => {
      // Create 2 more characters to reach limit
      for (let i = 0; i < 2; i++) {
        await createCharacterPreset(
          {
            name: `Character ${i}`,
            systemPrompt: "Test prompt",
          },
          userId,
        );
      }

      // 4th character should fail
      await expect(
        createCharacterPreset(
          {
            name: "4th Character",
            systemPrompt: "Test prompt",
          },
          userId,
        ),
      ).rejects.toThrow("Free tier limited to 3 custom characters");
    });

    it("should create system characters", async () => {
      const sysChar = await createCharacterPreset(
        {
          name: "Socratic Tutor",
          description: "Guides with questions",
          avatar: "🎓",
          systemPrompt: "You ask questions to guide learning...",
          isPublic: true,
        },
        userId, // Even though userId provided, isSystem bypasses it
        true, // isSystem = true
      );

      expect(sysChar.isSystem).toBe(true);
      expect(sysChar.userId).toBeNull();

      systemCharacterId = sysChar.id;
    });
  });

  describe("getCharacterPresets", () => {
    it("should return system, user, and public presets", async () => {
      const result = await getCharacterPresets(userId);

      expect(result.system.length).toBeGreaterThan(0);
      expect(result.userCreated.length).toBeGreaterThan(0);
      expect(Array.isArray(result.public)).toBe(true);
    });

    it("should filter by category", async () => {
      const result = await getCharacterPresets(userId, { category: "Coding" });

      expect(
        result.userCreated.every((c) => c.category === "Coding" || !c.category),
      ).toBe(true);
    });

    it("should search by name", async () => {
      const result = await getCharacterPresets(userId, {
        searchQuery: "Python",
      });

      expect(result.userCreated.some((c) => c.name.includes("Python"))).toBe(
        true,
      );
    });
  });

  describe("getCharacterById", () => {
    it("should return character if user owns it", async () => {
      const character = await getCharacterById(characterId, userId);

      expect(character).not.toBeNull();
      expect(character?.name).toBe("Python Expert");
    });

    it("should return system character for any user", async () => {
      const character = await getCharacterById(systemCharacterId, userId);

      expect(character).not.toBeNull();
      expect(character?.isSystem).toBe(true);
    });

    it("should deny access to other user's private character", async () => {
      const otherUserId = "other-user-id";
      const character = await getCharacterById(characterId, otherUserId);

      // Should be null if other user doesn't own it and it's not public
      expect(character).toBeNull();
    });
  });

  describe("updateCharacterPreset", () => {
    it("should update user's own character", async () => {
      const updated = await updateCharacterPreset(
        characterId,
        { description: "Updated description" },
        userId,
      );

      expect(updated.description).toBe("Updated description");
    });

    it("should prevent updating system characters", async () => {
      await expect(
        updateCharacterPreset(
          systemCharacterId,
          { description: "Trying to update" },
          userId,
        ),
      ).rejects.toThrow("cannot be modified");
    });
  });

  describe("deleteCharacterPreset", () => {
    it("should soft delete user's character", async () => {
      await deleteCharacterPreset(characterId, userId);

      const deleted = await prisma.character.findUnique({
        where: { id: characterId },
      });

      expect(deleted?.isActive).toBe(false);
    });

    it("should prevent deleting other user's character", async () => {
      const otherUserId = "other-user-id";

      await expect(
        deleteCharacterPreset(characterId, otherUserId),
      ).rejects.toThrow("don't have permission");
    });
  });

  describe("Prompt Builder", () => {
    it("should build character prompt with user memory", async () => {
      const prompt = await buildCharacterPrompt(systemCharacterId, userId);

      expect(prompt).toContain("You ask questions"); // From system prompt
    });

    it("should fall back to default prompt if character not found", async () => {
      const prompt = await buildCharacterPrompt("invalid-id", userId);

      // Should return default prompt without error
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe("string");
    });

    it("should return character model config", async () => {
      const config = await getCharacterConfig(systemCharacterId);

      expect(config.model).toBeTruthy();
      expect(config.temperature).toBeGreaterThanOrEqual(0);
      expect(config.temperature).toBeLessThanOrEqual(2);
    });
  });

  describe("Character Permissions", () => {
    it("should allow user to access their own character", async () => {
      const hasAccess = await canUserAccessCharacter(characterId, userId);
      expect(hasAccess).toBe(true);
    });

    it("should allow any user to access system character", async () => {
      const hasAccess = await canUserAccessCharacter(systemCharacterId, userId);
      expect(hasAccess).toBe(true);
    });

    it("should deny access to other user's private character", async () => {
      const otherUserId = "other-user-id";
      const hasAccess = await canUserAccessCharacter(characterId, otherUserId);
      expect(hasAccess).toBe(false);
    });
  });

  describe("Character Analytics", () => {
    it("should track popular characters by usage count", async () => {
      const popular = await getPopularCharacters(5);

      expect(Array.isArray(popular)).toBe(true);
      expect(popular.length).toBeLessThanOrEqual(5);
      // Should be sorted by usage (descending)
      for (let i = 0; i < popular.length - 1; i++) {
        expect(popular[i].usageCount).toBeGreaterThanOrEqual(
          popular[i + 1].usageCount,
        );
      }
    });
  });
});

describe("Character Chat Integration", () => {
  let userId: string;
  let chatId: string;
  let characterId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-chat-${Date.now()}@example.com`,
        password: "hashed_password",
        name: "Test User",
      },
    });
    userId = user.id;

    // Create a character
    const char = await createCharacterPreset(
      {
        name: "Test Character",
        systemPrompt: "You are a test assistant",
      },
      userId,
    );
    characterId = char.id;
  });

  afterAll(async () => {
    await prisma.chat.deleteMany({ where: { userId } });
    await prisma.character.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("should create chat with character", async () => {
    const chat = await prisma.chat.create({
      data: {
        userId,
        characterId,
        title: "Test Chat with Character",
      },
    });

    expect(chat.characterId).toBe(characterId);
    chatId = chat.id;
  });

  it("should load chat with character preset", async () => {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { Character: true },
    });

    expect(chat?.Character).not.toBeNull();
    expect(chat?.Character?.name).toBe("Test Character");
  });

  it("should preserve character when updating chat", async () => {
    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { title: "Updated Title" },
      include: { Character: true },
    });

    expect(updated.characterId).toBe(characterId);
    expect(updated.Character?.id).toBe(characterId);
  });

  it("should set characterId to null when deleting character", async () => {
    // Create new chat with character
    const chat = await prisma.chat.create({
      data: {
        userId,
        characterId,
        title: "Chat to be orphaned",
      },
    });

    // Soft delete the character
    await prisma.character.update({
      where: { id: characterId },
      data: { isActive: false },
    });

    // Chat should have null characterId now (due to CASCADE)
    const updated = await prisma.chat.findUnique({ where: { id: chat.id } });
    expect(updated?.characterId).toBeNull();
  });
});
