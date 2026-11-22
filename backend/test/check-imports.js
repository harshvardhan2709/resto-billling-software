const fs = require('fs');
const path = require('path');
const lucide = require('../../frontend/node_modules/lucide-react');

const files = [
  '../../frontend/src/components/layout/Sidebar.jsx',
  '../../frontend/src/components/layout/Header.jsx',
  '../../frontend/src/components/billing/ReceiptModal.jsx',
  '../../frontend/src/pages/Dashboard.jsx',
  '../../frontend/src/pages/Tables.jsx',
  '../../frontend/src/pages/Billing.jsx',
  '../../frontend/src/pages/BillHistory.jsx',
  '../../frontend/src/pages/Reports.jsx',
  '../../frontend/src/pages/MenuManagement.jsx',
  '../../frontend/src/pages/Login.jsx'
];

let hasError = false;
files.forEach(f => {
  const fullPath = path.resolve(__dirname, f);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  const match = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (match) {
    const icons = match[1].split(',').map(s => s.trim()).filter(Boolean);
    icons.forEach(ic => {
      if (!lucide[ic]) {
        console.error(`MISSING ICON in ${f}: ${ic}`);
        hasError = true;
      }
    });
  }
});

if (!hasError) {
  console.log('All lucide icons in all pages exist and are valid!');
}
