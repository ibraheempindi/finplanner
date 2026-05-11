# Changelog - Budget Planner

## Version 1.0 - Initial Release with Enhanced Features

### Release Date: May 10, 2026

This version introduces significant improvements to the Budget Planner application, focusing on better user experience, enhanced category management, and improved UI consistency.

---

## ✨ New Features

### 1. **Hide Plan Form with Persistent State**
- Added "Hide" button on the Monthly Budget Plan section that toggles visibility of the plan form
- The button is positioned on the same line as the section heading for better layout
- Consistent styling with the Balance Summary toggle button (blue color)
- Hides only the form section (history selector and plan input form) while keeping the current plan display visible
- Toggle state is persisted to localStorage, so user preference is retained across page reloads
- Button text changes to "Show" when form is hidden

**Files Modified:**
- `public/index.html` - Added hide button and restructured form layout
- `public/app.js` - Added toggle logic with localStorage persistence

### 2. **Dynamic Category Addition on Main Plan Page**
- Added "+ Add Category" button after the list of planned budget categories
- Users can easily add a new category without needing to edit the JSON plan
- Button opens a prompt for:
  1. New category name
  2. Planned amount for that category
- After adding, the plan automatically refreshes and the new category becomes available for expense recording
- Green button styling to distinguish it as an action button

**Files Modified:**
- `public/app.js` - Added `addPlanCategory` logic with API integration

### 3. **Category Addition from Expense Form**
- Added "+ Add New Category" option at the end of the category dropdown on the expense recording form
- Users can add a new category directly while recording an expense
- When selected, it prompts for:
  1. New category name
  2. Planned amount for that category
- After adding:
  - The plan is refreshed from the server
  - Expenses are reloaded
  - Category dropdown is repopulated
  - The newly added category is automatically selected
  - User receives a success confirmation

**Files Modified:**
- `public/app.js` - Added `handleAddNewCategory` function with server refresh logic

### 4. **Enhanced Login Experience**
- Logout button now displays the logged-in user's email address
- Format: "Logout (user@example.com)"
- Provides visual confirmation of which account is currently logged in
- User email is stored in localStorage on successful login

**Files Modified:**
- `public/login.html` - Store user email on successful authentication
- `public/index.html` - Display email on logout button

---

## 🎨 UI/UX Improvements

### Consistent Button Styling
- Hide Plan button now matches the Balance Summary toggle button styling
- Both use blue color (#3498db) for consistency
- Both use the same text labels ("Hide" and "Show") instead of descriptive text

### Improved Layout and Spacing
- Plan form section wrapped in a dedicated container for better state management
- Better visual hierarchy with the Hide button positioned alongside the heading
- Current plan display stays visible when form is hidden

### Balance Summary Bar Enhancements
- Centered layout for better visual presentation
- Summary chips displayed in a flex layout with center alignment
- Improved responsive design for mobile devices

---

## 🔧 Technical Improvements

### State Management
- Added localStorage support for:
  - Plan form collapse state (`planFormCollapsed`)
  - Summary bar collapse state (`summaryBarCollapsed`)
- User preferences persist across browser sessions

### API Integration
- Added support for adding categories through existing `/api/plan/expense` endpoint
- Improved refresh logic when adding categories from expense form
- Full data sync after category addition (plan, expenses, and dropdown)

### Code Organization
- Separated form section into its own container for cleaner DOM structure
- Better event delegation and cleanup for dynamic elements
- New dedicated function `handleAddNewCategory` for managing category addition from dropdown

---

## 📝 Bug Fixes

### Login Page
- Fixed indentation and code formatting for better readability
- Improved error handling for authentication failures

### UI Elements
- Fixed margin/padding inconsistencies
- Improved button hover states across all sections

---

## 📦 Files Changed

**Modified Files:**
1. `public/app.js` - Core functionality additions and improvements
2. `public/index.html` - HTML structure and layout changes
3. `public/login.html` - Enhanced login/logout experience
4. `public/styles.css` - Minor styling adjustments for consistency

**New Utility Files:**
- `restart-app.cmd` - Windows batch script for restarting the application

---

## 🚀 How to Use New Features

### Adding a Category from Main Page
1. Navigate to the Monthly Budget Plan section
2. Scroll to the bottom of planned categories
3. Click the green "+ Add Category" button
4. Enter the category name when prompted
5. Enter the planned amount for the category
6. The category is added and available immediately

### Adding a Category from Expense Form
1. Navigate to the Daily Expenses section
2. In the Category dropdown, select "+ Add New Category"
3. Enter the category name when prompted
4. Enter the planned amount for the category
5. The category is added and automatically selected for your current expense

### Hiding the Plan Form
1. Click the blue "Hide" button next to "Monthly Budget Plan"
2. The form section is hidden, but the current plan display remains visible
3. Click "Show" to display the form again
4. Your preference is saved and will persist on future visits

---

## ✅ Testing Recommendations

- Test adding multiple categories in succession
- Verify localStorage persistence by refreshing the page
- Test category addition from both locations (main page and expense form)
- Verify responsive layout on mobile devices
- Test with both light theme and potential dark mode implementations

---

## 📋 Version Compatibility

- **Node.js:** v14+ recommended
- **Browser Support:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **Database:** PostgreSQL (via existing db.js configuration)

---

## 🔄 Migration Notes

No breaking changes. This version is fully backward compatible with existing user data.

---

## 📞 Support

For issues or feature requests related to version 1.0 improvements, please ensure:
1. You have the latest changes from this version
2. localStorage is enabled in your browser
3. You're using a supported browser version

---

## Future Enhancements

Potential features for future versions:
- Dark mode support
- Budget alerts and notifications
- Recurring expense templates
- Category color customization
- Monthly comparison charts
- Export/import functionality
