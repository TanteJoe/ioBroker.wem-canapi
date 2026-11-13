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
export function parseCSV(content: string): Datapoint[] {
	if (!content) {
		return [];
	}
	const lines = content.split('\n');
	//const groups = parseLines(content);
	//groupLines(lines);
	const result: Datapoint[] = [];

	lines.forEach((g, i) => {
		try {
			const dp = _csvRowToDatapoint(g);
			if (dp) {
				result.push(dp);
			}
		} catch (e: any) {
			console.warn(`[CSV] Gruppe ${i} übersprungen:`, e.message);
		}
	});

	return result;
}
function _stringToRecord(str): Record<number, string> {
	if (!str) {
		return null;
	}

	const unescaped = _unescapeCSVValue(str);

	if (!unescaped) {
		return null;
	}

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

function _stringToBoolean(str: string): boolean {
	return str.toLowerCase() === 'true';
}

function _unescapeCSVValue(value): string {
	if (!value) {
		return '';
	}

	const stringValue = String(value);

	// Check if value is wrapped in quotes
	if (stringValue.startsWith('"') && stringValue.endsWith('"')) {
		// Remove surrounding quotes and unescape doubled quotes
		return stringValue.slice(1, -1).replace(/""/g, '"');
	}

	return stringValue;
}
function _csvRowToDatapoint(row): Datapoint {
	if (!row) {
		return null;
	}

	// Split by comma, but respect quoted values
	const values = parseCSVRow(row);
	console.log('Anzahl felder ${values.length}');
	if (values.length < 21) {
		return null;
	} // Ensure we have all expected fields

	return {
		id: `${_unescapeCSVValue(values[6])}_${_unescapeCSVValue(values[7])}_${_unescapeCSVValue(values[0])}_${_unescapeCSVValue(values[1])}}_${_unescapeCSVValue(values[2])}_${_unescapeCSVValue(values[3])}_${_unescapeCSVValue(values[4])}`,
		MI: parseInt(_unescapeCSVValue(values[0]), 16),
		MX: parseInt(_unescapeCSVValue(values[1]), 16),
		OX: parseInt(_unescapeCSVValue(values[2]), 16),
		OS: parseInt(_unescapeCSVValue(values[3]), 16),
		VS: parseInt(_unescapeCSVValue(values[4]), 16),
		updateInterval: parseInt(_unescapeCSVValue(values[5]), 10),
		deviceGroupName: _unescapeCSVValue(values[6]),
		deviceName: _unescapeCSVValue(values[7]),
		pointName: _unescapeCSVValue(values[8]),
		pointfunction: _stringToRecord(values[9]),
		dataType: _unescapeCSVValue(values[10]),
		resolution: _unescapeCSVValue(values[11]),
		unit: _unescapeCSVValue(values[12]),
		sCov: _unescapeCSVValue(values[13]),
		enumValues: _stringToRecord(values[14]),
		canWrite: _stringToBoolean(_unescapeCSVValue(values[15])),
		ioType: _unescapeCSVValue(values[16]),
		treePath: `${_unescapeCSVValue(values[6])}.${_unescapeCSVValue(values[7])}.${_unescapeCSVValue(values[8])}`,
		label: _unescapeCSVValue(values[18]),
		readHex: _unescapeCSVValue(values[19]),
		respbites: _unescapeCSVValue(values[20]),
	};
}

// Helper function to properly parse CSV row respecting quotes
function parseCSVRow(row): string[] {
	const values = [];
	let current = '';
	let inQuotes = false;
	//Test if Line ist Datapoint.DP must start with DCC
	const di = row.indexOf('DCC');
	if (di < 0) {
		console.log('DDC nicht gefunden');
		return null;
	}
	let i = 0;

	for (i = 0; i < row.length; i++) {
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
		} else if (char === ';' && !inQuotes) {
			// End of field
			console.log('Feld ende gefunden');
			if (current != 'DCC') {
				values.push(current);
			}
			current = '';
		} else {
			current += char;
		}
	}

	// Add the last field
	values.push(current);

	return values;
}
