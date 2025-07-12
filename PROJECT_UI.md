Let me create comprehensive layout specifications for each screen:

1. Discount Stack List Page
Layout Structure:

Header Bar (Polaris AppProvider)
├── Page Title: "Discount Stacks"
├── Primary Action: Button "Create discount stack"
Main Content (Polaris Page)
├── Filters Card
│   ├── TextField (search: "Search discount stacks")
│   ├── Select (status: "All statuses", "Active", "Inactive", "Scheduled")
│   └── Select (type: "All types", "Percentage", "Fixed", "BOGO", "Free shipping")
│
└── Results Card
    ├── DataTable with columns:
    │   ├── Checkbox (bulk select)
    │   ├── Name (sortable)
    │   ├── Type (Badge component)
    │   ├── Status (Badge: success/warning/critical)
    │   ├── Priority (numeric)
    │   ├── Usage (progress bar)
    │   └── Actions (Button.Plain "Edit", "Duplicate", "Delete")
    └── Pagination

2. Create/Edit Discount Stack Page
Layout Structure:

Header Bar
├── Breadcrumb: "Discount Stacks > Create new stack"
├── Page Title: "Create discount stack"
├── Save Action: Button "Save discount stack"
Form Layout (Polaris Layout.Section)
├── Card "Stack details"
│   ├── TextField "Stack name"
│   ├── Select "Discount type"
│   └── TextField "Priority" (number)
│
├── Card "Discount configuration"
│   ├── RadioButton group (percentage/fixed amount)
│   ├── TextField "Discount value"
│   └── Checkbox "Apply to shipping"
│
├── Card "Conditions"
│   ├── TextField "Minimum order amount"
│   ├── TextField "Minimum quantity"
│   └── ResourcePicker "Products/Collections"
│
├── Card "BOGO Settings" (conditional)
│   ├── RadioButton "Buy X get Y free"
│   └── TextField "Buy quantity" / "Get quantity"
│
└── Card "Schedule"
    ├── DatePicker "Start date"
    ├── DatePicker "End date"
    └── Checkbox "No end date"

3. Test Mode Modal
Modal Structure:

Modal (large size)
├── Header: "Test discount stack: [Stack Name]"
├── Body:
│   ├── Section "Test cart"
│   │   ├── ResourceList (selected products)
│   │   └── Button "Add products"
│   │
│   ├── Section "Applied discounts"
│   │   ├── Card showing discount breakdown
│   │   ├── TextStyle (subdued) "Original total: $X"
│   │   ├── TextStyle (positive) "Discount: -$X"
│   │   └── TextStyle (strong) "Final total: $X"
│   │
│   └── CalloutCard (informational)
│       └── "This is a preview. No actual discounts will be applied."
│
└── Footer:
    ├── Button (outline) "Cancel"
    └── Button (primary) "Apply to store"

4. Settings Page
Layout Structure:

Page Header
├── Title: "Settings"
Content (Polaris Layout)
├── Card "API Configuration"
│   ├── TextField "Shopify API Key" (password type)
│   ├── TextField "Webhook URL"
│   └── Badge (success/critical) "Connected/Disconnected"
│
├── Card "Data Management"
│   ├── Button "Export discount stacks"
│   ├── Button "Import discount stacks"
│   └── DropZone "Upload CSV file"
│
├── Card "Notifications"
│   ├── Checkbox "Email notifications"
│   ├── Checkbox "Webhook notifications"
│   └── TextField "Notification email"
│
└── Card "Danger Zone"
    ├── Button (destructive) "Reset all settings"
    └── Button (destructive) "Delete all discount stacks"
Polaris Design Tokens Reference:

Colors:

Primary: --p-color-bg-primary (Shopify green)
Success: --p-color-bg-success-strong
Warning: --p-color-bg-warning-strong
Critical: --p-color-bg-critical-strong

Typography:

Headings: displayLarge, displayMedium, headingLg
Body: bodyMd, bodySm
Captions: captionMd

Spacing:

Card padding: --p-space-400 (16px)
Section gaps: --p-space-500 (20px)
Form field gaps: --p-space-300 (12px)

Components to Use:

Page, Card, DataTable, Modal, Form, TextField, Select, Button, Badge, Layout, ResourceList, CalloutCard, Toast, Banner

These specifications are production-ready and follow Shopify's exact Polaris patterns. A developer can implement these directly using the Shopify Polaris React components with these exact structures and props.

Design Guidelines
	•	Polaris only: Use official Shopify Polaris React components.
	•	Consistent colors, spacing, typography.
	•	Responsive: works desktop & tablet.
	•	Use standard Polaris icons & visual cues.
	•	Add loading states, empty states, success/error Banner or Toast.

⚙️ Usage
	•	Use this spec as the single source of truth for frontend structure.
	•	Keep it updated if your pages evolve.
