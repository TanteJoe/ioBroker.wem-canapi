export interface Datapoint {
	id: string;
	MI: number;
	MX: number;
	OX: number;
	OS: number;
	VS: number;
	updateInterval: number; //10 field in csv
	deviceGroupName: string;
	deviceName: string;
	pointName: string; //15 in csv
	function: Record<number, string> | null;
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
/*
  id,
            MI,  //3 field in csv
            MX: decReg,
            OX:     regHex,
            OS:,
            VS:,
            updateInterval:  ivl, //10 field in csv
            deviceGroupName:,
            deviceName:,
            pointName:, //15 in csv
            function:        func,
            dataType:        dtype,
            resolution:      resol,
            unit:            this._unit(resol, dtype),
            deviceName:      devName,
            sCov,
            enumValues:      enums,
            canWrite:        sCov.includes('S'),
            ioType:          this._type(dtype),            
            treePath:        path,
            label:           func ? `${regName} – ${func}` : regName,
            */

export function parseCSV(content: string): Datapoint[] {
	if (!content) {
		return [];
	}
	//const lines  = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
	const groups = parseLines(content);
	//groupLines(lines);
	const result: Datapoint[] = [];

	groups.forEach((g, i) => {
		try {
			const dp = parseGroup(g);
			if (dp) {
				result.push(dp);
			}
		} catch (e: any) {
			console.warn(`[CSV] Gruppe ${i} übersprungen:`, e.message);
		}
	});

	return result;
}

function groupLines(lines: string[]): string[][] {
	const out: string[][] = [];
	let cur: string[] = [];

	for (const line of lines) {
		if (!line?.trim()) {
			continue;
		}

		// Fix: erkennt sowohl ";DDC;" als auch "DDC" in der Zeile
		if (line.includes('DDC') && line.split(';').indexOf('DDC') >= 0) {
			if (cur.length) {
				out.push(cur);
			}
			cur = [line];
		} else {
			cur.push(line);
		}
	}

	if (cur.length) {
		out.push(cur);
	}
	return out;
}

const ss = (arr: string[], i: number): string => {
	const v = arr[i];
	return v != null ? String(v).trim() : '';
};

const fl = (s: string): string => {
	if (!s) {
		return '';
	}
	return String(s)
		.split(/[\n\r]/)[0]
		.trim();
};
function parseLines(text, delimiter = ';') {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const next = text[i + 1];

		if (char === '"') {
			if (inQuotes && next === '"') {
				field += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			row.push(field);
			field = '';
		} else if ((char === '\n' || char === '\r') && !inQuotes) {
			if (char === '\r' && next === '\n') {
				i++;
			}
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else {
			field += char;
		}
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows;
}
function parseValueList(field): Record<number, string> | null {
	if (typeof field !== 'string') {
		return null;
	}

	const lines = field
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line.length > 0);

	// Muss mindestens eine Zeile im Format "zahl: text" enthalten
	const valueListPattern = /^\d+\s*:\s*.+$/;
	const result = {};
	if (lines.length === 0 || !lines.every(line => valueListPattern.test(line))) {
		return { 0: field };
	}

	for (const line of lines) {
		const match = line.match(/^(\d+)\s*:\s*(.+)$/);
		if (match) {
			const key = match[1];
			const value = match[2].trim();
			result[key] = value;
		}
	}

	return result;
}

function parseGroup(lines: string[]): Datapoint | null {
	if (!lines?.length) {
		return null;
	}

	const parts = lines;
	// (lines[0] || '').split(';');

	// DDC finden - funktioniert mit und ohne führendem ;
	const di = parts.indexOf('DDC');
	if (di < 0) {
		return null;
	}

	const g = (i: number) => ss(parts, di + i);
	const gm = (i: number) => ss(parts, di + 13 + i);

	const mi = parseInt(g(2), 10) || 1;
	const mx = parseInt(g(3), 10) || 4;
	const ox = parseInt(g(4), 16) || 0;
	const os = parseInt(g(5), 16) || 0;
	const vs = parseInt(g(6), 16) || 0;
	const upInterva = parseInt(g(9), 10) || 60;
	const dgroupName = g(10);
	const dName = g(11);

	const func = parseValueList(g(15));
	const pName = func['0'] === g(15) && func['0'].toLowerCase() !== 'aktueller wert' ? `${g(14)} ${func[0]}` : g(14);
	/*if ((func === g(15)) && (func.toLowerCase() !== 'aktueller wert') ) {
       const pName= g(14)+func;} else {const pName  = g(14)};*/
	const dTypede = g(16);
	const resol = g(17);
	const respbites = g(18);
	const scov = g(19);
	/*const sCov     = g(5));
    const updStr   = fl(gm(6));*/

	/*if (!regName) return null;*/

	const full = lines.join('\n');
	const enums = extractEnums(full);
	/*const regAddr = parseInt(regHex, 16) || 0;
    const regCnt  = parseInt(lenHex, 16) || 1;*/

	/*const h = (v: number, d: number) =>
        (v >>> 0).toString(16).toUpperCase().padStart(d, '0');

    const readhex = h(slaveNr,2) + h(funcCode,2) + '00' +
                    h(regAddr,4) + h(subIdx,2)   + h(regCnt,4) + '00';*/
	const readhex = `${g(2) + g(3) + g(4) + g(5) + g(6)}00`;

	return {
		id: `${dgroupName}_${dName}_${mi}_${mx}_${ox}_${os}_${vs}`,
		MI: mi,
		MX: mx,
		OX: ox,
		OS: os,
		VS: vs,
		updateInterval: upInterva, //10 field in csv
		deviceGroupName: dgroupName,
		deviceName: dName,
		pointName: pName, //15 in csv
		function: func,
		dataType: dTypede,
		resolution: resol,
		unit: mapUnit(resol, dTypede),
		sCov: scov,
		enumValues: func,
		canWrite: scov.includes('S'),
		ioType: '',
		treePath: buildPath(dgroupName, dName, pName, ''),
		label: '',
		readHex: readhex,
		respbites: respbites,
	};
	/*return {
        id:              `${devType}_${devName}_${regNr || decReg}`,
        regNr,
        decimalRegister: decReg,
        hexRegister:     regHex,
        slaveNr,
        functionCode:    funcCode,
        registerAddress: regAddr,
        registerCount:   regCnt,
        subIndex:        subIdx,
        readHex,
        deviceType:      devType,
        deviceName:      devName,
        registerName:    regName,
        function:        func,
        dataType:        dtype,
        resolution:      resol,
        sCov,
        updateInterval:  calcIvl(updSec, updStr),
        enumValues:      enums,
        canWrite:        sCov.includes('S'),
        unit:            mapUnit(resol, dtype),
        treePath:        buildPath(devType, devName, regName, func),
        label:           func ? `${regName} – ${func}` : regName,
    }; */
}

function extractEnums(text: string): Record<number, string> | null {
	const map: Record<number, string> = {};
	const re = /(\d+):\s*([^\n;,]{2,50})/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const n = parseInt(m[1], 10);
		if (n <= 255) {
			map[n] = m[2].trim();
		}
	}
	return Object.keys(map).length ? map : null;
}

function calcIvl(sec: number, s: string): number {
	if (!s) {
		return sec || 60;
	}
	if (s.includes('s/')) {
		return Math.max(sec, 10);
	}
	if (s.includes('m/')) {
		return Math.max(sec * 6, 60);
	}
	if (s.includes('l/')) {
		return Math.max(sec * 6, 600);
	}
	return sec || 60;
}

function mapUnit(res: string, dt: string): string {
	const r = (res || '').toLowerCase();
	const d = (dt || '').toLowerCase();
	if (r.includes('°c') || d.includes('temperatur')) {
		return '°C';
	}
	if (r.includes('kwh')) {
		return 'kWh';
	}
	if (r.includes('kw')) {
		return 'kW';
	}
	if (r.includes('l/h')) {
		return 'l/h';
	}
	if (r.includes('bar')) {
		return 'bar';
	}
	if (r.includes('%')) {
		return '%';
	}
	if (r.includes(' h')) {
		return 'h';
	}
	return '';
}

function buildPath(t: string, n: string, r: string, f: string): string {
	const s = (str: string) =>
		(str || '')
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/Ä/g, 'Ae')
			.replace(/Ö/g, 'Oe')
			.replace(/Ü/g, 'Ue')
			.replace(/ß/g, 'ss')
			.replace(/[^a-zA-Z0-9_-]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_|_$/g, '')
			.toLowerCase();

	const parts = [s(t), s(n), s(r)];
	if (f && f !== r) {
		parts.push(s(f));
	}
	return parts.filter(Boolean).join('.');
}
