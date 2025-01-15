const downloadCSV = (data, filename) => {
  // Convert data to CSV string
  const csvContent = data.map(row => 
    Object.values(row)
      .map(value => 
        typeof value === 'object' 
          ? JSON.stringify(value) 
          : String(value)
      )
      .map(value => `"${value.replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');

  // Create headers row
  const headers = Object.keys(data[0]).join(',');
  const fullCSV = `${headers}\n${csvContent}`;

  // Create and trigger download
  const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}.csv`);
  a.style.visibility = 'hidden';
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Clean up the URL object
};

export { downloadCSV }; 