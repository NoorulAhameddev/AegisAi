# UI Component Quick Reference

## 🎨 Import Components
```tsx
import { 
  Button, Input, Badge, Card, LoadingSpinner,
  Toast, EmptyState, ProgressBar, Skeleton 
} from '@/components/ui';
```

---

## 🔘 Button
```tsx
// Primary button
<Button variant="primary" size="lg">Click Me</Button>

// Gradient button
<Button variant="gradient">Gradient Style</Button>

// With loading
<Button loading={isLoading}>Processing...</Button>

// With icon
<Button icon={<Plus />}>Add New</Button>
```

---

## 📝 Input
```tsx
// Basic input
<Input label="Email" placeholder="you@example.com" />

// With icon
<Input 
  label="Password" 
  type="password"
  icon={<Lock />} 
/>

// With error
<Input 
  label="Username"
  error="Username is required"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>

// With helper text
<Input 
  helperText="We'll never share your email"
  label="Email"
/>
```

---

## 🏷️ Badge
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="danger" size="sm">Error</Badge>
<Badge variant="purple">Premium</Badge>
```

---

## 🃏 Card
```tsx
<Card hover glow>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description here</CardDescription>
  </CardHeader>
  <CardContent>
    Your content
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## ⏳ Loading
```tsx
// Spinner
<LoadingSpinner size="lg" text="Loading..." />

// Full page overlay
<LoadingOverlay text="Processing your request..." />

// Skeleton loaders
<Skeleton className="h-8 w-32" />
<CardSkeleton />
<MessageSkeleton />
```

---

## 🎉 Toast Notifications
```tsx
const { showToast } = useToast();

// Usage
showToast("Success!", "success");
showToast("Error occurred", "error");
showToast("Warning message", "warning");
showToast("Info message", "info");
```

---

## 📊 Progress Bar
```tsx
<ProgressBar 
  value={75} 
  max={100} 
  showLabel 
  variant="gradient" 
/>
```

---

## 🌟 Empty State
```tsx
<EmptyState
  icon={MessageSquare}
  title="No messages yet"
  description="Start a conversation"
  action={{
    label: "New Chat",
    onClick: () => router.push('/chat')
  }}
/>
```

---

## 🎨 Common Patterns

### Form with Loading
```tsx
<form onSubmit={handleSubmit}>
  <Input label="Email" icon={<Mail />} />
  <Input label="Password" type="password" icon={<Lock />} />
  <Button variant="primary" loading={loading} className="w-full">
    {loading ? "Signing in..." : "Sign In"}
  </Button>
</form>
```

### Stat Card
```tsx
<Card hover glow>
  <div className="flex justify-between items-start">
    <div>
      <p className="text-zinc-400 font-medium mb-1">Total Users</p>
      <h3 className="text-4xl font-bold">1,234</h3>
    </div>
    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
      <Users className="h-6 w-6" />
    </div>
  </div>
</Card>
```

### Loading State Pattern
```tsx
{loading ? (
  <CardSkeleton />
) : data ? (
  <Card>Content</Card>
) : (
  <EmptyState title="No data" />
)}
```

---

## 🎭 Animation Classes

```tsx
// Fade in
className="animate-fade-in"

// Slide up
className="animate-slide-up"

// With delay
className="animate-slide-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]"

// Float
className="animate-float"

// Pulse
className="animate-pulse-slow"

// Shimmer
className="shimmer"
```

---

## 🎨 Glassmorphism

```tsx
// Glass card
className="glass-card"

// Glass panel
className="glass-panel"

// Custom glass
className="bg-zinc-900/50 backdrop-blur-xl border border-white/10"
```

---

## 🌈 Gradient Text

```tsx
<h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
  Gradient Heading
</h1>
```

---

## 💡 Tips

1. **Always provide loading states** for async operations
2. **Use proper semantic HTML** (buttons, inputs, labels)
3. **Add ARIA labels** for accessibility
4. **Keep animations subtle** - don't overdo it
5. **Test on mobile** - ensure touch targets are 44px+
6. **Use consistent spacing** - multiples of 4px
7. **Provide error feedback** - show what went wrong
8. **Handle empty states** - don't show blank screens

---

## 🎯 Common Recipes

### Modal Pattern
```tsx
{isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle>Modal Title</CardTitle>
      </CardHeader>
      <CardContent>Content</CardContent>
      <CardFooter>
        <Button onClick={onClose}>Close</Button>
      </CardFooter>
    </Card>
  </div>
)}
```

### List Item Pattern
```tsx
<div className="group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-purple-500/20 transition-all">
  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
    <Icon className="h-6 w-6" />
  </div>
  <div className="flex-1">
    <h4 className="font-medium">Title</h4>
    <p className="text-sm text-zinc-500">Description</p>
  </div>
  <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

### Search Input Pattern
```tsx
<div className="relative">
  <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
  <Input 
    className="pl-10"
    placeholder="Search..."
  />
</div>
```

---

**Quick Ref Version:** 1.0  
**Last Updated:** January 24, 2026
