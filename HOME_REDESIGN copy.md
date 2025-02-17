# Home Page Redesign Plan

## Features from Monzo Reference

### 1. Top Bar Features [DONE]

- [✓] Profile/Account indicator [DONE]
- [✗] Upgrade/Premium feature button (ignored - premium features not needed)
- [✗] Rewards/Gift section (ignored - premium features not needed)
- [✓] Search functionality [DONE]
- [✓] Quick add button [DONE]
- [✓] System status indicators [DONE]

### 2. Summary Cards [DONE]

- [✓] Personal total balance [DONE]
  - Large amount display with decimal alignment
  - Bank icon indicator
  - Card-based layout (75% screen width)
- [✓] Joint account balance (if applicable) [DONE]
  - Shared account indicators
  - Multiple user avatars support
  - Conditional rendering
- [✓] Monthly spend overview [DONE]
  - Negative amount formatting
  - Spending-specific styling
- [✓] Visual indicators for shared accounts [DONE]
  - Primary user indicator
  - Secondary user avatars
  - Customizable colors
- [✓] Quick glance financial status [DONE]
  - Clean typography hierarchy
  - Subtle secondary text
  - Responsive card sizing

### 3. Account Cards Stack [DONE]

- [✓] Card-based layout for each bank [DONE]
  - Full-width cards
  - Proper stacking with z-index
  - Overlapping cards effect
  - Bank-specific colors
- [✓] Bank-specific branding and colors [DONE]
  - AMEX Blue (#016FD0)
  - HSBC Red (#DB0011)
  - Monzo variations (Joint/Flex/Standard)
  - Dynamic text colors
- [✓] Prominent balance display [DONE]
  - Large typography (28px)
  - Decimal point alignment
  - Negative balance support
- [✓] Support for negative balances [DONE]
  - Proper formatting
  - Consistent alignment
- [✓] Account type indicators [DONE]
  - JOINT/FLEX labels
  - Uppercase styling
  - Proper opacity
- [✓] Account detail preview [DONE]
  - Account numbers
  - Sort codes
  - Overdraft information
- [✓] Interactive Features [DONE]
  - Expandable cards
  - Quick action buttons
  - More options menu
  - Add money & Card actions

### 4. Detailed Account Information

- [✓] Account numbers/details
- [✓] Quick action buttons (Add money, Card management)
- [✓] Account settings menu
- [✓] Overdraft/credit information

### 7. Visual Design Elements [PARTIALLY DONE]

- [✗] Dark mode support (keeping current theme)
- [✓] Card-based UI components [DONE]
- [✓] Bank branding integration [DONE]
- [✓] Typography hierarchy [DONE]
- [✓] Consistent spacing system [DONE]
- [✓] Modern, clean aesthetic [DONE]

## Current App Features to Maintain

### Bank Connection Features [PARTIALLY DONE]

- [✓] Display connected banks list [DONE]
- [✓] Connection status indicators
- [✓] Account count per bank
- [✓] Last sync date
- [✓] Disconnect functionality
- [✓] Add new bank option [DONE]

### Technical Requirements [DONE]

- [✓] TrueLayer integration [DONE]
- [✓] Connection state management [DONE]
- [✓] Error handling [DONE]
- [✓] Success flows [DONE]
- [✓] Deep linking support [DONE]

### Development Features [DONE]

- [✓] Notification testing interface (moved to bottom) [DONE]
- [✓] Loading states [DONE]
- [✓] Error messages [DONE]
- [✓] Debug information [DONE]

## Implementation Notes

1. Keep existing bottom navigation system
2. Notification testing interface to be moved to bottom [DONE]
3. Maintain current theme/styling system [DONE]
4. Premium/upgrade features to be ignored for now [DONE]

## Next Steps

1. Begin implementation of approved features [IN PROGRESS]
2. Prioritize features in this order:
   a. Top bar and layout structure [DONE]
   b. Summary cards [DONE]
   c. Account cards stack [DONE]
   d. Detailed account information [NEXT]
   e. Visual design elements [PARTIALLY DONE]
3. Move notification testing interface to bottom [DONE]
4. Maintain all current technical features while implementing new UI [IN PROGRESS]

## Visual Refinements Completed

### Summary Cards

1. Layout:

   - Cards sized to 75% of screen width
   - Consistent padding and spacing
   - Minimum height for visual balance
   - Horizontal scrolling with proper gaps

2. Typography:

   - Large amount display (32px)
   - Decimal point alignment
   - Subtle secondary text
   - Proper font weights and spacing

3. Visual Elements:

   - Refined bank icons with subtle opacity
   - Circular indicators for shared accounts
   - Primary/Secondary user distinction
   - Proper spacing and alignment

4. Interactive Elements:
   - Smooth horizontal scrolling
   - No scroll indicators
   - Touch-friendly sizing

### Account Cards Stack

1. Layout:

   - Full-width cards (width - 32px)
   - Overlapping cards (-12px margins)
   - Proper z-indexing for stacking
   - Expandable card states

2. Interactivity:

   - Tap to expand cards
   - Scale transform on expansion
   - Quick action buttons
   - More options menu

3. Visual Polish:
   - Bank-specific branding colors
   - Consistent typography
   - Proper shadows and elevation
   - Smooth transitions
