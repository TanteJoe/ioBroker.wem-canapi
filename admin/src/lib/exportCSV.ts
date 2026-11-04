import { Datapoint } from './csvParser';

function escapeCSVValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function recordToString(record: Record<number, string> | null): string {
  if (!record) return '';

  const entries = Object.entries(record)
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

  return escapeCSVValue(entries);
}

const CSV_HEADERS = [
  'id',           // 1
  'MI',           // 2
  'MX',           // 3
  'OX',           // 4
  'OS',           // 5
  'VS',           // 6
  'updateInterval', // 7 (10th field in original order if needed)
  'deviceGroupName', // 8
  'deviceName',   // 9
  'pointName',    // 10 (15th field in original order if needed)
  'function',     // 11
  'dataType',     // 12
  'resolution',   // 13
  'unit',         // 14
  'sCov',         // 15
  'enumValues',   // 16
  'canWrite',     // 17
  'ioType',       // 18
  'treePath',     // 19
  'label',        // 20
  'readHex',      // 21
  'respbites',    // 22
];

const datapointToCSVRow = (datapoint: Datapoint): string => {
  const values = [
    escapeCSVValue(datapoint.id),
    escapeCSVValue(datapoint.MI),
    escapeCSVValue(datapoint.MX),
    escapeCSVValue(datapoint.OX),
    escapeCSVValue(datapoint.OS),
    escapeCSVValue(datapoint.VS),
    escapeCSVValue(datapoint.updateInterval),
    escapeCSVValue(datapoint.deviceGroupName),
    escapeCSVValue(datapoint.deviceName),
    escapeCSVValue(datapoint.pointName),
    recordToString(datapoint['function']),
    escapeCSVValue(datapoint.dataType),
    escapeCSVValue(datapoint.resolution),
    escapeCSVValue(datapoint.unit),
    escapeCSVValue(datapoint.sCov),
    recordToString(datapoint.enumValues),
    escapeCSVValue(datapoint.canWrite),
    escapeCSVValue(datapoint.ioType),
    escapeCSVValue(datapoint.treePath),
    escapeCSVValue(datapoint.label),
    escapeCSVValue(datapoint.readHex),
    escapeCSVValue(datapoint.respbites),
  ];

  return values.join(',');
};

export function generateCSV(datapoints: Datapoint[]): string {
  const headerRow = CSV_HEADERS.join(',');
  const dataRows = datapoints.map(datapointToCSVRow);

  return [headerRow, ...dataRows].join('\n');
}

// Optional: Save to file (Node.js)
export function saveCSVToFile(datapoints: Datapoint[], filePath: string): void {
  const fs = require('fs');
  const csv = generateCSV(datapoints);
  fs.writeFileSync(filePath, csv, 'utf-8');
  console.log(`CSV saved to ${filePath}`);
}

// Optional: Download in browser
export function downloadCSV(datapoints: Datapoint[], fileName: string = 'datapoints.csv'): void {
  const csv = generateCSV(datapoints);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
export  const handleDownload = async () => {
  const response = await fetch('./canapi.csv');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'canapi.csv'); // Specify filename
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};   
