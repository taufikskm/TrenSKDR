# TODO - Dashboard Provinsi Layout Update

## Task: Make Chart and Table Side by Side

- [x] 1. Analyze the current codebase structure
- [x] 2. Update dashboard_provinsi.html - Add wrapper container for side-by-side layout
- [x] 3. Update style.css - Add CSS for side-by-side layout and scrollable table
- [x] 4. Update dashboard_provinsi.js - Make chart height dynamic based on number of provinces
- [x] 5. Test the implementation

## Implementation Details:
1. Create a `.chart-data-container` wrapper in HTML to hold both chart and table side by side
2. Add CSS for flexbox layout with responsive design
3. Make chart height dynamic: `number of provinces × 30px` (minimum 400px)
4. Add overflow-y: auto to table container for scrollable content
5. Ensure both sections have matching heights


