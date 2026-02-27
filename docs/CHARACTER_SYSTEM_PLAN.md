# AI Character/Persona System - Implementation Plan

## ðŸ§  Brainstormed Approaches

### Approach 1: Database-Driven Character Presets (RECOMMENDED)

**Concept**: Store character definitions in PostgreSQL, allowing per-user customization + admin-managed global presets.

**Pros**:

- âœ… Scalable - characters stored in DB with full CRUD operations
- âœ… User customization - users can create their own characters
- âœ… Admin control - system-wide presets (Teacher, Coding Expert, Creative Writer)
- âœ… Versioning - track character evolution over time
- âœ… Permission-based - RBAC integration (who can create/edit/delete)
- âœ… Analytics - track which characters are most popular

**Cons**:

- âŒ Requires database migration
- âŒ More complex implementation (but more flexible)

**Database Schema**:

```prisma
model CharacterPreset {
  id          String   @id @default(uuid())
  userId      String?  // NULL = system preset, non-NULL = user-created
  name        String   // "Socratic Tutor", "Code Reviewer", "Creative Writer"
  description String?  // User-facing description
  avatar      String?  // Avatar emoji or image URL
  systemPrompt String @db.Text // The actual prompt template
  temperature Float    @default(0.7)
  model       String   @default("openai/gpt-4o-mini")
  isPublic    Boolean  @default(false) // Can other users use this?
  isActive    Boolean  @default(true) // Soft delete
  tags        String[] @default([]) // ["education", "coding", "creative"]
  usageCount  Int      @default(0) // Popularity tracking
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  User User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  Chat Chat[] // Chats using this character
}

// Add to Chat model:
model Chat {
  // ... existing fields
  characterId String? // Selected character for this chat
  Character   CharacterPreset? @relation(fields: [characterId], references: [id], onDelete: SetNull)
}
```

---

### Approach 2: Config-File-Based Presets (SIMPLER)

**Concept**: Store character definitions in JSON/YAML config files, loaded at runtime.

**Pros**:

- âœ… No database migration needed
- âœ… Fast implementation (1-2 hours)
- âœ… Version controlled (Git tracks changes)
- âœ… Easy to share presets

**Cons**:

- âŒ No user customization without code deployment
- âŒ Harder to track usage analytics
- âŒ Can't dynamically add characters without restart
- âŒ No per-user character preferences stored

**Implementation**:

```typescript
// config/character-presets.json
{
  "presets": [
    {
      "id": "socratic-tutor",
      "name": "Socratic Tutor",
      "description": "Guides with questions, never gives direct answers",
      "avatar": "ðŸŽ“",
      "systemPrompt": "You are a Socratic tutor...",
      "temperature": 0.7,
      "model": "glm-5"
    },
    // ... more presets
  ]
}
```

---

### Approach 3: Hybrid (Config + Database Override)

**Concept**: Ship with default config-based presets, allow DB overrides for customization.

**Pros**:

- âœ… Best of both worlds
- âœ… Fast default presets from config
- âœ… User customization via DB
- âœ… Graceful fallback if DB fails

**Cons**:

- âŒ Most complex to maintain (two sources of truth)
- âŒ Potential sync issues between config and DB

---

## ðŸ“‹ Selected Approach: **Approach 1 (Database-Driven)**

**Rationale**:

- Aegis AI is already a database-heavy application (Prisma + PostgreSQL)
- User customization is critical for educational platform (students create personas)
- Analytics on character popularity informs future development
- Admin panel already exists - easy to add character management
- Follows existing patterns (Files, Projects, Chats all DB-backed)

---

## ðŸŽ¯ Implementation Plan

### Phase 1: Database Schema Extension

**Files to modify**:

- `prisma/schema.prisma` - Add `CharacterPreset` model + `Chat.characterId`
- Run migration: `npm run migrate`

**Database Migration**:

```prisma
model CharacterPreset {
  id            String   @id @default(uuid())
  userId        String?  // NULL = system preset, owned by admin
  name          String   @db.VarChar(255)
  description   String?  @db.Text
  avatar        String?  @db.VarChar(500) // Emoji or image URL
  systemPrompt  String   @db.Text
  temperature   Float    @default(0.7)
  model         String   @db.VarChar(100) @default("openai/gpt-4o-mini")
  maxTokens     Int?     // Optional token limit override

  // Visibility & permissions
  isPublic      Boolean  @default(false) // Available to all users
  isSystem      Boolean  @default(false) // Admin-created, cannot be deleted
  isActive      Boolean  @default(true)  // Soft delete

  // Metadata
  tags          String[] @default([])
  category      String?  @db.VarChar(100) // "Education", "Coding", "Creative"
  usageCount    Int      @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  User User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  Chat Chat[]

  @@index([userId, isActive])
  @@index([isPublic, isActive])
  @@index([category])
  @@index([tags])
}

// Extend Chat model
model Chat {
  // ... existing fields
  characterId String? // Selected character preset
  Character   CharacterPreset? @relation(fields: [characterId], references: [id], onDelete: SetNull)
}
```

---

### Phase 2: Backend Service Layer

**Files to create**:

- `apps/web/src/services/characters/character-service.ts` - Core character CRUD
- `apps/web/src/services/characters/preset-loader.ts` - Load system presets
- `apps/web/src/services/characters/prompt-builder.ts` - Build character-aware prompts

**Service Functions**:

```typescript
// character-service.ts
export async function getCharacterPresets(userId: string) {
  // Returns system presets + user's custom presets + public presets
}

export async function getCharacterById(characterId: string, userId: string) {
  // Returns character if user has permission (public, owned, or system)
}

export async function createCharacterPreset(
  data: CharacterData,
  userId: string,
) {
  // Create user-owned character
}

export async function updateCharacterPreset(
  characterId: string,
  data: Partial<CharacterData>,
  userId: string,
) {
  // Update if user owns it
}

export async function deleteCharacterPreset(
  characterId: string,
  userId: string,
) {
  // Soft delete (isActive = false)
}

export async function incrementUsageCount(characterId: string) {
  // Track popularity
}

// prompt-builder.ts
export async function buildCharacterPrompt(
  characterId: string,
  userId: string,
) {
  // Fetch character, return systemPrompt with optional user memory injection
}
```

---

### Phase 3: API Endpoints

**Files to create**:

- `apps/web/src/app/api/characters/route.ts` - GET (list), POST (create)
- `apps/web/src/app/api/characters/[id]/route.ts` - GET (details), PATCH (update), DELETE
- `apps/web/src/app/api/characters/system/route.ts` - Admin-only: create system presets

**API Routes**:

```
GET    /api/characters          - List available characters (system + user + public)
POST   /api/characters          - Create new character preset
GET    /api/characters/:id      - Get character details
PATCH  /api/characters/:id      - Update character
DELETE /api/characters/:id      - Delete character (soft)
POST   /api/characters/system   - Admin: Create system preset
```

**Response Examples**:

```json
// GET /api/characters
{
  "success": true,
  "data": {
    "system": [
      {
        "id": "sys-001",
        "name": "Socratic Tutor",
        "description": "Guides with questions, never gives direct answers",
        "avatar": "ðŸŽ“",
        "category": "Education",
        "isSystem": true,
        "usageCount": 1250
      }
    ],
    "userCreated": [],
    "public": []
  }
}

// POST /api/characters
{
  "name": "Python Expert",
  "description": "Specializes in Python programming",
  "systemPrompt": "You are a Python expert...",
  "temperature": 0.6,
  "tags": ["coding", "python"]
}
```

---

### Phase 4: Frontend UI Components

**Files to create**:

- `apps/web/src/components/characters/CharacterSelector.tsx` - Dropdown to select character
- `apps/web/src/components/characters/CharacterCard.tsx` - Display character info
- `apps/web/src/components/characters/CharacterManager.tsx` - Full CRUD interface
- `apps/web/src/components/characters/CreateCharacterModal.tsx` - Create new character

**CharacterSelector Component** (for chat interface):

```tsx
interface CharacterSelectorProps {
  selectedCharacterId?: string;
  onSelect: (characterId: string) => void;
}

export function CharacterSelector({
  selectedCharacterId,
  onSelect,
}: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<CharacterPreset[]>([]);

  useEffect(() => {
    fetch("/api/characters")
      .then((res) => res.json())
      .then((data) => {
        // Combine system + user + public presets
        setCharacters([
          ...data.data.system,
          ...data.data.userCreated,
          ...data.data.public,
        ]);
      });
  }, []);

  return (
    <Select value={selectedCharacterId} onValueChange={onSelect}>
      {characters.map((char) => (
        <SelectItem key={char.id} value={char.id}>
          <span className="flex items-center gap-2">
            <span>{char.avatar}</span>
            <span>{char.name}</span>
          </span>
        </SelectItem>
      ))}
    </Select>
  );
}
```

**CharacterManager Component** (for settings page):

- List all characters (system, user-created, public)
- Search/filter by tags/category
- Create new character (modal)
- Edit/delete user-owned characters
- Preview character (shows system prompt, model, temperature)

---

### Phase 5: Chat Integration

**Files to modify**:

- `apps/web/src/app/api/chat/stream-sse/route.ts` - Use character prompt if `characterId` present
- `apps/web/src/services/ai/prompt.ts` - Integrate `buildCharacterPrompt()`
- `apps/web/src/components/chat/ChatClient.tsx` - Add character selector
- `apps/web/src/app/api/chat/create/route.ts` - Accept `characterId` when creating chat

**Modified Chat Flow**:

```typescript
// stream-sse/route.ts
export async function POST(req: NextRequest) {
  const { chatId, message } = await req.json();
  const user = await verifyAuth(req);

  // Fetch chat to get characterId
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { Character: true },
  });

  // Build system prompt from character (or use default)
  const systemPrompt = chat?.Character
    ? chat.Character.systemPrompt
    : await buildSystemPrompt(user.id);

  // Use character's model + temperature if available
  const model = chat?.Character?.model || "openai/gpt-4o-mini";
  const temperature = chat?.Character?.temperature || 0.7;

  // Continue with OpenAI call...
  const completion = await openai.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
    ],
  });
}
```

---

### Phase 6: Default System Presets Seeder

**Files to create**:

- `prisma/seeders/character-presets.ts` - Seed default characters
- `scripts/seed-characters.ts` - CLI to run seeder

**Default Characters**:

```typescript
const DEFAULT_CHARACTERS = [
  {
    name: "Socratic Tutor",
    description: "Guides learning with questions, never gives direct answers",
    avatar: "ðŸŽ“",
    category: "Education",
    tags: ["education", "pedagogy", "questioning"],
    systemPrompt: `You are a Socratic tutor. Your goal is to help students learn by asking guiding questions, not by providing direct answers.

RULES:
1. When a student asks a question, counter with "What have you tried so far?"
2. Break down complex problems into smaller sub-questions
3. Provide hints through questions: "What would happen if you...?"
4. Celebrate thinking process, not just correct answers
5. Use analogies and thought experiments to clarify concepts

Never:
- Give direct code solutions
- Solve problems for the student
- Rush to the answer

Always:
- Ask "why?" and "how?"
- Encourage experimentation
- Validate effort and reasoning`,
    temperature: 0.7,
    model: "glm-5",
    isSystem: true,
    isPublic: true,
  },
  {
    name: "Code Reviewer",
    description: "Analyzes code for bugs, performance, and best practices",
    avatar: "ðŸ”",
    category: "Coding",
    tags: ["coding", "review", "debugging"],
    systemPrompt: `You are a senior code reviewer. Your job is to analyze code for:
1. Bugs and edge cases
2. Performance issues (time/space complexity)
3. Security vulnerabilities
4. Code style and readability
5. Best practices and design patterns

Format your feedback as:
âœ… What's good (positive reinforcement)
âš ï¸ Issues to fix (categorized by severity)
ðŸ’¡ Suggestions for improvement

Never:
- Rewrite the entire code
- Use harsh language
- Assume the student is incompetent

Always:
- Explain WHY something is an issue
- Provide examples of better approaches
- Link to documentation when relevant`,
    temperature: 0.5,
    model: "glm-5",
    isSystem: true,
    isPublic: true,
  },
  {
    name: "Creative Writer",
    description:
      "Helps with storytelling, world-building, and creative writing",
    avatar: "âœï¸",
    category: "Creative",
    tags: ["creative", "writing", "storytelling"],
    systemPrompt: `You are a creative writing coach. You help writers brainstorm ideas, develop characters, build worlds, and refine their prose.

Your approach:
1. Ask about their story's core theme and message
2. Help develop compelling characters with depth
3. Build immersive worlds with consistent rules
4. Suggest plot twists and dramatic tension
5. Provide stylistic feedback on prose

Use:
- Rich vocabulary and vivid imagery
- Story examples from literature
- Writing exercises and prompts

Avoid:
- Generic advice ("show don't tell" without context)
- Imposing your story on theirs
- Discouraging their creative vision`,
    temperature: 0.9, // Higher creativity
    model: "glm-5",
    isSystem: true,
    isPublic: true,
  },
  {
    name: "Math Tutor",
    description: "Explains mathematical concepts with step-by-step reasoning",
    avatar: "ðŸ”¢",
    category: "Education",
    tags: ["math", "education", "problem-solving"],
    systemPrompt: `You are a patient math tutor. Break down complex mathematical concepts into intuitive steps.

Teaching style:
1. Start with concrete examples before abstractions
2. Use visual analogies (number lines, geometric shapes)
3. Show step-by-step solutions with reasoning
4. Relate math to real-world applications
5. Check for understanding at each step

When solving problems:
- Show your work explicitly
- Explain WHY each step follows from the previous
- Use LaTeX for formulas: $E=mc^2$ or $$\\int_0^1 x^2 dx$$
- Draw connections to previously learned concepts

Never:
- Skip steps assuming they're "obvious"
- Use unexplained jargon
- Rush through explanations`,
    temperature: 0.4, // Lower for precision
    model: "glm-5",
    isSystem: true,
    isPublic: true,
  },
  {
    name: "Debugging Assistant",
    description: "Helps identify and fix bugs through systematic investigation",
    avatar: "ðŸ›",
    category: "Coding",
    tags: ["debugging", "troubleshooting", "coding"],
    systemPrompt: `You are a debugging expert. Help students systematically identify and fix bugs.

Debugging methodology:
1. Understand the expected behavior
2. Reproduce the bug consistently
3. Isolate the problem (binary search through code)
4. Form hypotheses about root cause
5. Test hypotheses with print statements/debugger
6. Fix and verify

Questions to ask:
- "What did you expect to happen?"
- "What actually happened?"
- "Can you reproduce it every time?"
- "What have you already tried?"

Techniques to teach:
- Rubber duck debugging
- Print statement investigation
- Debugger usage (breakpoints, watches)
- Reading stack traces
- Understanding error messages

Never:
- Just give the fixed code
- Assume bugs are trivial
- Blame the student for mistakes`,
    temperature: 0.6,
    model: "glm-5",
    isSystem: true,
    isPublic: true,
  },
];
```

---

### Phase 7: Admin Interface

**Files to create**:

- `apps/web/src/components/admin/CharactersTab.tsx` - Admin panel for managing system characters
- Extend `apps/web/src/app/admin/page.tsx` - Add "Characters" tab

**Admin Features**:

- Create/edit/delete system presets
- View usage analytics (most popular characters)
- Approve/reject public character submissions
- Featured characters section

---

## ðŸ§ª Testing Strategy

### Unit Tests

**Files to create**:

- `apps/web/src/__tests__/services/character-service.test.ts`
- `apps/web/src/__tests__/api/characters.test.ts`

**Test Cases**:

1. Create character preset (user-owned)
2. Fetch available characters (system + user + public)
3. Update character (permission check)
4. Delete character (soft delete verification)
5. Character prompt building with user memory
6. Usage count increment
7. RBAC: Only owner can edit/delete non-system characters

### Integration Tests

1. Create chat with character â†’ verify system prompt used
2. Switch character mid-chat â†’ verify new prompt applied
3. Delete character â†’ verify chats revert to default
4. Admin creates system character â†’ verify available to all users

### E2E Tests (Manual)

1. Open chat â†’ Select "Socratic Tutor" â†’ Ask coding question â†’ Verify response is question-based
2. Settings â†’ Create custom character â†’ Use in chat â†’ Verify custom prompt works
3. Admin panel â†’ Create system character â†’ Verify appears for all users
4. Delete custom character â†’ Verify removed from character list

---

## ðŸ“Š Success Metrics

1. **User Engagement**: % of chats using custom characters (target: 40%)
2. **Character Creation**: # of user-created characters (target: 500/month)
3. **Popular Characters**: Track top 5 most-used system presets
4. **Session Duration**: Does character usage increase chat length? (hypothesis: yes)

---

## ðŸš€ Deployment Checklist

- [ ] Database migration tested in staging
- [ ] Seed default characters in production DB
- [ ] API endpoints tested with Postman/curl
- [ ] Frontend UI tested in Chrome, Firefox, Safari
- [ ] RBAC permissions verified (user vs admin)
- [ ] Analytics tracking implemented
- [ ] Documentation updated (README, API docs)
- [ ] Changelog entry added
- [ ] Feature flag enabled: `feature.characters.enabled = true`

---

## ðŸ”® Future Enhancements

### Phase 2 Features (Post-Launch)

1. **Character Marketplace**: Users share/sell custom characters
2. **Character Templates**: Quick-start templates for common use cases
3. **Multi-modal Characters**: Characters with voice/image preferences
4. **Character Memory**: Characters remember past interactions
5. **Character Evolution**: Characters adapt based on user feedback
6. **Team Characters**: Organization-wide shared characters
7. **Character Analytics Dashboard**: Detailed insights per character
8. **A/B Testing**: Test different character variants
9. **Character Ratings**: Users rate character quality

---

## ðŸ“ Notes

- **Character Switching Mid-Chat**: Supported - new system prompt applies to next message
- **Migration Path**: Existing chats get `characterId = NULL` â†’ use default prompt
- **Performance**: Character fetch cached in Redis (5-min TTL)
- **Security**: User-created characters sanitized (no prompt injection)
- **Monetization**: Pro tier gets unlimited custom characters (Free tier: 3 max)

---

**Implementation Time Estimate**: 8-12 hours

- Phase 1 (DB): 1 hour
- Phase 2 (Backend): 2 hours
- Phase 3 (API): 2 hours
- Phase 4 (UI): 3 hours
- Phase 5 (Integration): 1 hour
- Phase 6 (Seeding): 1 hour
- Phase 7 (Admin): 1 hour
- Testing: 1-2 hours

**Ready to proceed with implementation!**

