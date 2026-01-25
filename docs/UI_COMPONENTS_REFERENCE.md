# UI/UX Components Quick Reference

## 🎨 All New & Enhanced Components

### Core Components

#### 1. Dialog (Modal)
```tsx
import { Dialog } from '@/components/ui';

<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Title"
  description="Optional description"
  size="md" // sm, md, lg, xl
  footer={<button>Action</button>}
>
  Content here
</Dialog>
```

#### 2. Notification (Toast)
```tsx
import { Notification, NotificationContainer } from '@/components/ui';

// Single notification
<Notification
  title="Success!"
  message="Optional message"
  type="success" // success, error, warning, info, loading
  duration={5000}
  action={{ label: "Undo", onClick: () => {} }}
  closeButton={true}
/>

// Container with multiple
<NotificationContainer notifications={notifications} onRemove={onRemove} />
```

#### 3. Tooltip
```tsx
import { Tooltip } from '@/components/ui';

<Tooltip 
  content="Help text" 
  side="top" // top, bottom, left, right
  delay={200}
>
  <button>Hover me</button>
</Tooltip>
```

#### 4. Dropdown Menu
```tsx
import { Dropdown } from '@/components/ui';

<Dropdown
  trigger="Menu"
  align="left" // left, right
  items={[
    { 
      label: "Edit", 
      icon: <Edit />, 
      onClick: () => {}, 
      disabled: false 
    },
    { 
      label: "Delete", 
      icon: <Trash />, 
      onClick: () => {},
      isDanger: true 
    },
  ]}
/>
```

#### 5. Breadcrumb
```tsx
import { Breadcrumb } from '@/components/ui';

<Breadcrumb
  items={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Files", href: "/files", icon: <FileIcon /> },
    { label: "Current", href: undefined }, // Last item not clickable
  ]}
/>
```

#### 6. Collapsible Section
```tsx
import { Collapsible } from '@/components/ui';

<Collapsible
  title="Settings"
  description="Manage your settings"
  icon={<Settings />}
  defaultOpen={false}
>
  Content
</Collapsible>
```

#### 7. Tabs
```tsx
import { Tabs, TabContent } from '@/components/ui';

const [tab, setTab] = useState("general");

<Tabs
  tabs={[
    { label: "General", value: "general", icon: <Settings /> },
    { label: "Security", value: "security", icon: <Lock /> },
  ]}
  activeTab={tab}
  onTabChange={setTab}
/>

<TabContent value="general" activeTab={tab}>
  General content
</TabContent>
```

#### 8. Skeleton Loaders
```tsx
import { SkeletonLoader, CardSkeletonLoader } from '@/components/ui';

// Generic skeleton
<SkeletonLoader count={3} className="h-4 w-full" />

// Card skeleton
<CardSkeletonLoader />
```

---

## 🚀 Common Usage Patterns

### Loading with Skeleton
```tsx
{isLoading ? (
  <CardSkeletonLoader />
) : (
  <YourContent />
)}
```

### Error Notification
```tsx
catch (error) {
  setNotifications(prev => [...prev, {
    title: "Error",
    message: error.message,
    type: "error",
    duration: 5000,
  }]);
}
```

### Conditional Section
```tsx
<Collapsible 
  title="Advanced" 
  defaultOpen={show}
>
  <AdvancedSettings />
</Collapsible>
```

### Modal Workflow
```tsx
const [open, setOpen] = useState(false);

<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Confirm"
  footer={
    <>
      <button onClick={() => setOpen(false)}>Cancel</button>
      <button onClick={handleConfirm}>Confirm</button>
    </>
  }
>
  Are you sure?
</Dialog>
```

---

## 🎨 Animation Classes

### Entrance Animations
- `animate-fade-in` - Fade in
- `animate-slide-up` - Slide up
- `animate-slide-down` - Slide down
- `animate-scale-up` - Zoom in
- `animate-float` - Float animation
- `animate-float-slow` - Slow float

### Continuous Animations
- `animate-pulse-slow` - Slow pulse
- `animate-pulse-subtle` - Subtle pulse
- `animate-shimmer` - Shimmer effect
- `animate-bounce-subtle` - Bounce
- `animate-sway` - Sway effect
- `animate-spin` - Spin (default Tailwind)

### Usage
```tsx
<div className="animate-fade-in">Content</div>
<div className="animate-slide-down">Modal</div>
<div className="animate-shimmer">Loading</div>
```

---

## 🎯 Color Variants

### Text Colors
- `text-zinc-400` - Secondary text
- `text-zinc-500` - Tertiary text
- `text-white` - Primary text
- `text-purple-400` - Accent text
- `text-emerald-400` - Success text
- `text-red-400` - Error text

### Background Colors
- `bg-zinc-900` - Primary dark
- `bg-zinc-800` - Secondary dark
- `bg-purple-500/10` - Accent highlight
- `bg-white/5` - Subtle highlight

### Borders
- `border-white/10` - Subtle border
- `border-purple-500/20` - Accent border
- `border-white/5` - Very subtle border

---

## 📱 Responsive Classes

### Hidden on Mobile
```tsx
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Responsive Text
```tsx
<p className="text-sm md:text-base lg:text-lg">
  Responsive text
</p>
```

---

## ♿ Accessibility Features

### All Components Include:
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Focus visible indicators
- ✅ Semantic HTML structure
- ✅ Color contrast compliance

### Keyboard Shortcuts
- `Escape` - Close dialogs, dropdowns
- `Tab` / `Shift+Tab` - Navigate
- `Enter` - Confirm actions
- `Space` - Toggle buttons

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}
```

---

## 🔧 Advanced Customization

### Custom Animation
```tsx
// In your component
<div className="animate-fade-in" style={{
  '--duration': '1000ms'
} as React.CSSProperties}>
  Content
</div>
```

### Custom Colors
```tsx
// Use Tailwind color utilities
<div className="bg-purple-600/20 border border-purple-500/30">
  Custom styled
</div>
```

### Custom Sizes
```tsx
// Dialog sizes: sm (384px), md (448px), lg (512px), xl (576px)
<Dialog size="lg">...</Dialog>

// Button sizes: sm, md, lg (via Button component)
<Button size="lg">Large Button</Button>
```

---

## 💡 Best Practices

### Do's ✅
- Use `Tooltip` for all button hints
- Use `Notification` for user feedback
- Use `Collapsible` for settings sections
- Wrap modals with `Dialog` component
- Use skeleton loaders during data fetch
- Add focus states to all interactive elements

### Don'ts ❌
- Don't overuse animations (limit to meaningful UX)
- Don't create custom modals (use Dialog)
- Don't display multiple notifications (use container)
- Don't forget accessibility attributes
- Don't use animations on preference-reduced-motion users

---

## 📚 Import Cheatsheet

```tsx
// All in one
import {
  Dialog,
  Notification,
  NotificationContainer,
  Tooltip,
  Dropdown,
  Breadcrumb,
  Collapsible,
  Tabs,
  TabContent,
  SkeletonLoader,
  CardSkeletonLoader,
  Button,
  Input,
  Card,
  Badge,
} from '@/components/ui';
```

---

## 🐛 Common Issues & Solutions

### Notification doesn't appear
- Ensure `NotificationContainer` is in your layout
- Check notification state management
- Verify `onRemove` callback is implemented

### Tooltip position wrong
- Use `side` prop to adjust position
- Check parent element z-index
- Verify no parent has `overflow: hidden`

### Animation janky
- Check for conflicting CSS
- Use `will-change` sparingly
- Profile with DevTools Performance

### Mobile layout broken
- Use responsive classes (md:, lg:)
- Test with device emulator
- Ensure touch targets are 44px+

---

## 🔗 Related Documentation
- [UI/UX Improvements Guide](./UI_UX_IMPROVEMENTS.md)
- [Global Styles](../src/app/globals.css)
- [Component Library](../src/components/ui/)
