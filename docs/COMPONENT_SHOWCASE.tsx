'use client';

import { useState } from 'react';
import { 
  Dialog, Notification, NotificationContainer, Tooltip, Dropdown,
  Breadcrumb, Collapsible, Tabs, TabContent, SkeletonLoader,
  Button, Input, Badge, Card, CardHeader, CardTitle, CardContent
} from '@/components/ui';
import { Settings, Save, Trash2, Edit2, Info } from 'lucide-react';

/**
 * UI Components Showcase
 * 
 * This page demonstrates all available UI components and their variations.
 * Use this as a reference for implementation and styling.
 * 
 * Components shown:
 * - Dialog/Modal
 * - Notifications
 * - Tooltips
 * - Dropdowns
 * - Breadcrumbs
 * - Collapsible sections
 * - Tabs
 * - Skeleton loaders
 * - Badges and Buttons
 */

export default function ComponentShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('components');

  const addNotification = (type: 'success' | 'error' | 'warning' | 'info') => {
    const notif = {
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
      message: `This is a ${type} notification example`,
      type,
      duration: 5000,
    };
    setNotifications([...notifications, notif]);
  };

  const removeNotification = (idx: number) => {
    setNotifications(n => n.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-black p-8">
      {/* Notification Container */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            UI Components Showcase
          </h1>
          <p className="text-zinc-400 text-lg">
            All available components with examples and implementation patterns
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Breadcrumb Navigation</h2>
          <Breadcrumb
            items={[
              { label: 'Components', href: '#' },
              { label: 'UI Showcase', href: '#' },
              { label: 'Navigation' },
            ]}
          />
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { label: 'Components', value: 'components', icon: <Settings className="h-4 w-4" /> },
            { label: 'States', value: 'states', icon: <Info className="h-4 w-4" /> },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Components Tab */}
        <TabContent value="components" activeTab={activeTab}>
          <div className="mt-8 space-y-8">
            {/* Dialog Example */}
            <Card>
              <CardHeader>
                <CardTitle>Dialog Component</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setDialogOpen(true)}
                  variant="primary"
                >
                  Open Dialog
                </Button>
                <Dialog
                  open={dialogOpen}
                  onOpenChange={setDialogOpen}
                  title="Example Dialog"
                  description="This is a modal dialog component"
                  footer={
                    <>
                      <Button 
                        variant="secondary"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="primary"
                        onClick={() => {
                          setDialogOpen(false);
                          addNotification('success');
                        }}
                      >
                        Confirm
                      </Button>
                    </>
                  }
                >
                  <p className="text-zinc-300 mb-4">
                    This is an example of a modal dialog. It supports custom sizes, styling, and footer actions.
                  </p>
                </Dialog>
              </CardContent>
            </Card>

            {/* Notifications Example */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Button 
                    onClick={() => addNotification('success')}
                    variant="primary"
                    size="sm"
                  >
                    Success
                  </Button>
                  <Button 
                    onClick={() => addNotification('error')}
                    variant="danger"
                    size="sm"
                  >
                    Error
                  </Button>
                  <Button 
                    onClick={() => addNotification('warning')}
                    variant="secondary"
                    size="sm"
                  >
                    Warning
                  </Button>
                  <Button 
                    onClick={() => addNotification('info')}
                    variant="primary"
                    size="sm"
                  >
                    Info
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tooltips Example */}
            <Card>
              <CardHeader>
                <CardTitle>Tooltips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Tooltip content="Top tooltip" side="top">
                    <Button>Hover Top</Button>
                  </Tooltip>
                  <Tooltip content="Bottom tooltip" side="bottom">
                    <Button>Hover Bottom</Button>
                  </Tooltip>
                  <Tooltip content="Left tooltip" side="left">
                    <Button>Hover Left</Button>
                  </Tooltip>
                  <Tooltip content="Right tooltip" side="right">
                    <Button>Hover Right</Button>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            {/* Dropdown Example */}
            <Card>
              <CardHeader>
                <CardTitle>Dropdown Menu</CardTitle>
              </CardHeader>
              <CardContent>
                <Dropdown
                  trigger="Actions"
                  items={[
                    { label: 'Edit', icon: <Edit2 className="h-4 w-4" />, onClick: () => addNotification('info') },
                    { label: 'Save', icon: <Save className="h-4 w-4" />, onClick: () => addNotification('success') },
                    { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, isDanger: true, onClick: () => addNotification('error') },
                  ]}
                />
              </CardContent>
            </Card>

            {/* Collapsible Example */}
            <Card>
              <CardHeader>
                <CardTitle>Collapsible Section</CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible
                  title="Advanced Settings"
                  description="Click to expand advanced options"
                  icon={<Settings className="h-4 w-4" />}
                >
                  <div className="space-y-4">
                    <Input label="Option 1" placeholder="Enter value" />
                    <Input label="Option 2" placeholder="Enter value" />
                  </div>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Badges Example */}
            <Card>
              <CardHeader>
                <CardTitle>Badge Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="success">Success</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="purple">Premium</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Skeleton Example */}
            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loaders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Loading placeholder:</p>
                    <SkeletonLoader count={3} className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabContent>

        {/* States Tab */}
        <TabContent value="states" activeTab={activeTab}>
          <div className="mt-8 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Button States</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Primary</p>
                    <Button variant="primary">Primary</Button>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Secondary</p>
                    <Button variant="secondary">Secondary</Button>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Ghost</p>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Danger</p>
                    <Button variant="danger">Danger</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Button Sizes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center flex-wrap">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loading States</CardTitle>
              </CardHeader>
              <CardContent>
                <Button loading>Processing...</Button>
              </CardContent>
            </Card>
          </div>
        </TabContent>
      </div>
    </div>
  );
}
