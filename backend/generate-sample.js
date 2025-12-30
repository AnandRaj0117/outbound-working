const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Create samples directory if it doesn't exist
const samplesDir = path.join(__dirname, 'samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir);
}

// Create sample data with Customer_Id column
const sampleData = [
  { Customer_Id: '00uml8w9rnpOoQFlE4x7' },
  { Customer_Id: '01abc1234defGHI5678J' },
  { Customer_Id: '02xyz9876fedCBA4321K' },
  { Customer_Id: '03pqr5432mnoPQR1234L' },
  { Customer_Id: '04stu6789klmSTU5678M' }
];

// Create workbook and worksheet
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(sampleData);

// Add worksheet to workbook
xlsx.utils.book_append_sheet(workbook, worksheet, 'Customers');

// Write to file
const filePath = path.join(samplesDir, 'Sample_Customer_Upload.xlsx');
xlsx.writeFile(workbook, filePath);

console.log('✅ Sample Excel file created successfully at:', filePath);
