# Design Guidelines: Customer Case Management System

## Design Approach

**System Selected**: Material Design principles with influences from Linear and modern SaaS dashboards
**Justification**: This is a productivity-focused admin application requiring clear information hierarchy, efficient data entry, and robust status tracking. The design prioritizes usability, scanability, and professional aesthetics over visual flair.

## Core Design Principles

1. **Clarity First**: Every interface element serves a clear functional purpose
2. **Efficient Workflows**: Minimize clicks, optimize form layouts, provide clear navigation paths
3. **Visual Hierarchy**: Use typography and spacing to guide attention, not color
4. **Consistent Patterns**: Reuse component structures throughout the application

## Typography System

**Font Stack**: 
- Primary: Inter (Google Fonts) - for all UI text, labels, body content
- Monospace: JetBrains Mono (Google Fonts) - for Customer IDs, Serial Numbers, Model Numbers

**Hierarchy**:
- Page Titles: text-3xl font-semibold (Super Admin Dashboard, Customer Profile)
- Section Headers: text-xl font-semibold (Customer Information, Product Cases)
- Card Titles: text-lg font-medium (Customer names, Case headers)
- Body Text: text-base font-normal (Form labels, descriptions)
- Small Text: text-sm (Timestamps, metadata, helper text)
- Tiny Text: text-xs (Status badges, secondary info)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-6 or p-8
- Section margins: mb-6 or mb-8
- Form field spacing: gap-4 or gap-6
- Card spacing: space-y-4
- Grid gaps: gap-4 or gap-6

**Page Structure**:
- Fixed sidebar navigation (256px width on desktop, collapsible on mobile)
- Top header bar with user profile, search, and quick actions
- Main content area with max-w-7xl container and px-6 py-8 padding
- Responsive breakpoints: mobile (base), tablet (md), desktop (lg, xl)

## Component Library

### Navigation & Header
- **Sidebar**: Fixed left navigation with logo at top, main menu items with icons (Heroicons), logout at bottom
- **Top Bar**: Breadcrumb navigation, global search input, user avatar with dropdown menu
- **Breadcrumbs**: text-sm with chevron separators, clickable trail to current page

### Dashboard & Cards
- **Dashboard Grid**: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 for stat cards
- **Customer Cards**: Rounded corners (rounded-lg), subtle border, p-6, hover state with slight elevation
- **Stat Cards**: Large number display with label below, icon in top-right corner

### Forms
- **Form Container**: Max width max-w-2xl, card-style with p-8
- **Input Groups**: grid grid-cols-1 md:grid-cols-2 gap-6 for multi-column forms
- **Labels**: text-sm font-medium, mb-2, always above inputs
- **Text Inputs**: Full width, rounded-md, border, px-4 py-2.5, focus:ring-2 effect
- **Dropdowns**: Same styling as text inputs with chevron-down icon
- **Text Areas**: Minimum h-32, resize-y enabled
- **Date Picker**: Native date input styled consistently
- **Buttons**: 
  - Primary: Solid fill, px-6 py-2.5, rounded-md, font-medium
  - Secondary: Border with transparent background, same padding
  - Danger: For delete actions

### Tables & Lists
- **Customer List**: Table layout on desktop, card layout on mobile
- **Table Headers**: Uppercase text-xs font-semibold, sticky header on scroll
- **Table Rows**: Hover state, clickable rows with subtle transition
- **Product Cases List**: Card-based layout with grid-cols-1 lg:grid-cols-2 gap-4

### Tabs
- **Tab Container**: Border-b, flex gap-8
- **Tab Items**: pb-3, border-b-2 when active, text-sm font-medium, smooth transition

### Timeline Component (Critical)
- **Container**: Vertical layout with left border line (border-l-2)
- **Timeline Items**: Relative positioning with circle indicator on border
- **Item Structure**: 
  - Avatar (40px circle) positioned on timeline border
  - Timestamp: text-xs above content
  - Author: text-sm font-medium with role badge
  - Content: p-4 card with rounded-lg, slight background tint
- **Spacing**: space-y-6 between timeline entries
- **Visual Flow**: Most recent at top, chronological descending

### Status & Badges
- **Status Pills**: Inline-flex items-center, rounded-full, px-3 py-1, text-xs font-medium
- **Payment Status**: Similar styling, displayed inline with case details
- **Customer ID Badge**: Monospace font, border, rounded, inline-block

### Modals & Overlays
- **Modal Container**: Fixed, centered, max-w-2xl, overlay with backdrop-blur
- **Modal Header**: pb-4 border-b with title and close button
- **Modal Body**: py-6, scrollable if needed
- **Modal Footer**: pt-4 border-t with action buttons aligned right

### Search & Filters
- **Global Search**: w-full max-w-md, icon prefix, placeholder text
- **Filter Dropdowns**: Multi-select capable, positioned in header area

### User Management
- **Admin List**: Table format with avatar, name, email, role, actions
- **Avatar Display**: Rounded-full, 32px or 40px sizes, fallback initials if no image
- **Profile Edit**: Inline form with avatar upload area prominent

## Responsive Behavior

**Mobile (< 768px)**:
- Sidebar collapses to hamburger menu
- Tables convert to stacked cards
- Two-column forms become single column
- Reduce padding to p-4

**Tablet (768px - 1024px)**:
- Sidebar remains visible but narrower
- Maintain two-column forms
- Product cases grid stays 2-column

**Desktop (> 1024px)**:
- Full sidebar navigation
- Maximum layout width with generous spacing
- Three-column dashboard grids where applicable

## Interactions & States

**Micro-interactions** (minimal):
- Smooth transitions on hover states (150ms)
- Focus rings on all interactive elements
- Loading spinners for async operations
- Success/error toast notifications (top-right corner)

**No Complex Animations**: Avoid scroll-triggered effects, parallax, or heavy animations. Focus on instant feedback and clarity.

## Accessibility

- Minimum contrast ratio 4.5:1 for all text
- Focus indicators on all interactive elements
- ARIA labels for icon-only buttons
- Keyboard navigation support throughout
- Screen reader-friendly timeline structure

This design creates a professional, efficient admin interface that prioritizes usability and information clarity while maintaining modern aesthetic standards.