export interface Datapoint {
    id: string;
    MI: number;
    MX: number;
    OX: number;
    OS: number;
    VS: number;
    updateInterval: number; 
    deviceGroupName: string;
    deviceName: string;
    pointName: string; 
    pointfunction: Record<number, string> | null;
    dataType: string;
    resolution: string;
    unit: string;
    sCov: string;
    enumValues: Record<number, string> | null;
    canWrite: boolean;
    ioType: string;
    treePath: string;
    label: string;
    readHex: string;
    respbites: string;
}
function _stringToRecord(str) {
    if (!str) return null;

    const unescaped = _unescapeCSVValue(str);

    if (!unescaped) return null;

    const entries = unescaped.split('|');
    const record = {};

    for (const entry of entries) {
        const [key, value] = entry.split(':');
        if (key !== undefined && value !== undefined) {
            record[Number(key)] = value;
        }
    }

    return record;
}

function _unescapeCSVValue(value) {
    if (!value) return '';

    const stringValue = String(value);

    // Check if value is wrapped in quotes
    if (stringValue.startsWith('"') && stringValue.endsWith('"')) {
        // Remove surrounding quotes and unescape doubled quotes
        return stringValue.slice(1, -1).replace(/""/g, '"');
    }

    return stringValue;
}
function _csvRowToDatapoint(row) {
    if (!row) return null;

    // Split by comma, but respect quoted values
    const values = parseCSVRow(row);

    if (values.length < 22) return null; // Ensure we have all expected fields

    return {
        id: _unescapeCSVValue(values[0]),
        MI: _unescapeCSVValue(values[1]),
        MX: _unescapeCSVValue(values[2]),
        OX: _unescapeCSVValue(values[3]),
        OS: _unescapeCSVValue(values[4]),
        VS: _unescapeCSVValue(values[5]),
        updateInterval: _unescapeCSVValue(values[6]),
        deviceGroupName: _unescapeCSVValue(values[7]),
        deviceName: _unescapeCSVValue(values[8]),
        pointName: _unescapeCSVValue(values[9]),
        pointfunction: _stringToRecord(values[10]),
        dataType: _unescapeCSVValue(values[11]),
        resolution: _unescapeCSVValue(values[12]),
        unit: _unescapeCSVValue(values[13]),
        sCov: _unescapeCSVValue(values[14]),
        enumValues: _stringToRecord(values[15]),
        canWrite: _unescapeCSVValue(values[16]),
        ioType: _unescapeCSVValue(values[17]),
        treePath: _unescapeCSVValue(values[18]),
        label: _unescapeCSVValue(values[19]),
        readHex: _unescapeCSVValue(values[20]),
        respbites: _unescapeCSVValue(values[21]),
    };
}

// Helper function to properly parse CSV row respecting quotes
function parseCSVRow(row) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote - add one quote and skip next
                current += '"';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last field
    values.push(current);

    return values;
}