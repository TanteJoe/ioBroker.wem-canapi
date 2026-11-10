'use strict';

const http  = require('http');
const https = require('https');
//const axios = require('axios');

/**
 * Weishaupt CAN-API HTTP Client
 * Kommuniziert über HTTP JSON API mit der Weishaupt Anlage
 */
class CanApiClient {

    /**
     * @param {object} config
     * @param {string}   config.host       IP/Hostname der Anlage
     * @param {number}   [config.port]     HTTP-Port (Standard 80)
     * @param {string}   [config.username] HTTP-Auth Benutzername
     * @param {string}   [config.password] HTTP-Auth Passwort
     * @param {number}   [config.timeout]  Request-Timeout in ms (Standard 5000)
     * @param {object}   config.log        ioBroker Logger
     */
    constructor(config) {
        this.host     = config.host;
        this.port     = config.port     || 80;
        this.username = config.username || 'admin';
        this.password = config.password || 'Admin123';
        this.timeout  = config.timeout  || 5000;
        this.log      = config.log      || console;

        this.baseUrl  = `http://${this.host}:${this.port}/ajax/CanApiJson.json`;
        this.testURL  = `http://${this.host}:${this.port}/`;
        this.reqId    = 0; // Laufende Request-ID
    }

    // ─────────────────────────────────────────────────────────────
    // Öffentliche Methoden
    // ─────────────────────────────────────────────────────────────

    /**
     * Liest einen einzelnen Datenpunkt
     * @param {object} datapoint  Datenpunkt aus CSV-Parser
     * @returns {Promise<number|boolean|null>}
     */
    async readDatapoint(datapoint) {
        const results = await this.readDatapoints([datapoint]);
        if (!results || results.length === 0) return null;
        return results[0].value;
    }

    /**
     * Liest mehrere Datenpunkte in einer HTTP-Anfrage (max. 10)
     * @param {object[]} datapoints
     * @returns {Promise<Array<{id, value, raw}>>}
     */
    async readDatapoints(datapoints) {
        // Maximal 6 Datenpunkte pro Request
        const chunks = this._chunkArray(datapoints, 6);
        const results = [];

        for (const chunk of chunks) {
            const chunkResults = await this._sendRequest(chunk);
            results.push(...chunkResults);
        }

        return results;
    }

    /**
     * Schreibt einen Wert in einen Datenpunkt
     * @param {object}         datapoint
     * @param {number|boolean} value
     * @returns {Promise<boolean>}
     */
    async writeDatapoint(datapoint, value) {
        if (!datapoint.canWrite) {
            this.log.warn(`[CanAPI] ${datapoint.registerName} ist schreibgeschützt`);
            return false;
        }

        try {
            // Wert in Hex-String konvertieren
            const hexString = this._buildWriteHexString(datapoint, value);
            const payload   = this._buildPayload([{
                ...datapoint,
                writeHex: hexString
            }], true);

            await this._httpPost(payload);
            return true;

        } catch (e) {
            this.log.error(`[CanAPI] Schreibfehler ${datapoint.registerName}: ${e.message}`);
            return false;
        }
    }

    /**
     * Verbindungstest
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        try {
            // Einfachen Lesezugriff auf Kollektortemperatur (immer vorhanden)
           /*  const testDP = {
                slaveNr:         1,
                functionCode:    4,
                registerAddress: 0x2501,
                subIndex:        0,
                registerCount:   2,
                registerName:    'ConnectionTest',
                dataType:        'Temperatur',
                resolution:      '0.1 °C',
            };
            const result = await this.readDatapoint(testDP);
            this.log.debug(`[CanAPI] Verbindungstest Ergebnis: ${result}`);
            return result !== null;
 */
const url = `http://${this.username}:${this.password}@${this.host}/`;
   //        const response = await axios.get(url);
 //   console.log(response.data); // Access the JSON data
    return true;
  } catch (error) {

    console.error(error);
    return false;
  }
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methoden
    // ─────────────────────────────────────────────────────────────
async _sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
    /**
     * Sendet einen Lese-Request für eine Gruppe von Datenpunkten
     * @param {object[]} datapoints
     * @returns {Promise<Array<{id, value, raw}>>}
     */
    async _sendRequest(datapoints) {
        const payload = this._buildPayload(datapoints, false);

        try {
            const responseText = await this._httpPost(payload);
            return this._parseResponse(responseText, datapoints);
            this.log.debug(responseText);
            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Usage:
await this._sleep(200);   
        } catch (e) {
            this.log.error(`[CanAPI] Request-Fehler: ${e.message}`);
            return datapoints.map(dp => ({ id: dp.id, value: null, raw: null }));
        }
    }

    /**
     * Baut das JSON-Payload für den Request
     *
     * Format:
     * {
     *   "ID": "00000001",
     *   "SRC": "DDC",
     *   "CAPI": {
     *     "NN": 2,
     *     "N01": { "VG": "010400250100000200" },
     *     "N02": { "VG": "010400250200000200" }
     *   }
     * }
     */
    _buildPayload(datapoints, isWrite) {
        this.reqId = (this.reqId + 1) % 100000000;

        const capi = {
            NN: datapoints.length
        };

        datapoints.forEach((dp, idx) => {
            const key    = `N${String(idx + 1).padStart(2, '0')}`;
            const hexStr = isWrite && dp.writeHex
                ? dp.writeHex
                : '01' + dp.readHex;

            capi[key] = { VG: hexStr };
        });
        //ID:   String(this.reqId).padStart(8, '0'),
        return JSON.stringify({
            ID: String(this.reqId).padStart(8, '0'),
            SRC:  'DDC',
            CAPI: capi
        });
    }

    /**
     * Baut den Hex-String für einen Lese-Request
     *
     * Struktur: SlaveNr FuncCode 00 RegAddr SubIdx Length 00
     * Beispiel: 01      04       00 2501    00     0002   00
     *
     * Als String: "010400250100000200"
     */
    _buildReadHexString(dp) {
        const slave    = this._toHex(dp.slaveNr     || 1,  2);
        const func     = this._toHex(dp.functionCode || 4,  2);
        const regAddr  = this._toHex(dp.registerAddress,    4);
        const subIdx   = this._toHex(dp.subIndex    || 0,  2);
        const length   = this._toHex(dp.registerCount|| 2,  4);

        return `${slave}${regAddr}${subIdx}${length}00`;
    }

    /**
     * Baut den Hex-String für einen Schreib-Request
     */
    _buildWriteHexString(dp, value) {
        // const slave   = this._toHex(dp.slaveNr      || 1, 2);
        // const regAddr = this._toHex(dp.registerAddress,   4);

        // Wert in Register-Rohwert umrechnen
        const factor   = this._getResolutionFactor(dp);
        const rawValue = Math.round(value * factor);
        const dpadress = dp.readHex.slice(0,-2);
        const bitescount= dp.respbites.match(/\d+/g);
        const bits = {
            1 : 0xFF,
            2 : 0xFFFF,
            3 : 0xFFFFFF,
            4 : 0xFFFFFFFF
        }

        const rawHex = this._toHex(rawValue & bits[bitescount], bitescount);
        return `02${dpadress}${rawHex}`;

        // Funktion Code für Schreiben:
        // FC 06 = Write Single Register
        // FC 16 = Write Multiple Registers
        // if (dp.registerCount <= 1) {
        //     const rawHex = this._toHex(rawValue & 0xFFFF, 4);
        //     return `${slave}06${regAddr}00${rawHex}00`;
        // } else {
        //     const rawHex = this._toHex(rawValue & 0xFFFFFFFF, 8);
        //     return `${slave}1000${regAddr}00${this._toHex(dp.registerCount, 4)}00${rawHex}`;
        // }
    }

    /**
     * Parst die Antwort der CAN-API
     *
     * Antwort-Format:
     * {
     *   "ID": "00000001",
     *   "SRC": "DDC",
     *   "CAPI": {
     *     "NN": 2,
     *     "N01": { "VG": "010400250100000200", "VW": "01AC" },
     *     "N02": { "VG": "...",                "VW": "00B4" }
     *   }
     * }
     * VW = Value Word (Rohwert als Hex)
     */
    _parseResponse(responseText, datapoints) {
        let response;

        try {
            response = JSON.parse(responseText);
        } catch (e) {
            this.log.error(`[CanAPI] JSON Parse-Fehler: ${e.message}`);
            this.log.debug(`[CanAPI] Response: ${responseText}`);
            return datapoints.map(dp => ({ id: dp.id, value: null, raw: null }));
        }

        const capi    = response.CAPI || {};
        const results = [];

        datapoints.forEach((dp, idx) => {
            const key     = `N${String(idx + 1).padStart(2, '0')}`;
            const entry   = capi[key];

            if (!entry || !entry.VG) {
                this.log.warn(`[CanAPI] Kein Wert für ${dp.registerName} (${key})`);
                results.push({ id: dp.id, value: null, raw: null });
                return;
            }

            const rawHex = entry.VG;
            const value  = this._convertRawValue(rawHex, dp);

            this.log.debug(
                `[CanAPI] ${dp.pointName}: VW=${rawHex} → ${value} ${dp.unit || ''}`
            );

            results.push({ id: dp.id, value, raw: rawHex });
        });

        return results;
    }

    _splitResponse(response) {
		const sizes = [2, 2, 2, 4, 2, 4];
		const result = [];
		let i = 0;
		for (const size of sizes) {
			result.push(response.slice(i, i + size));
			i += size;
		}
		if (i < response.length) result.push(response.slice(i));
		//console.log(result);
        // Vorzeichenbehaftete 16-bit Werte
        /* const count = dp.registerCount || 1;
        if (count <= 1 && raw > 32767)  raw -= 65536;
        if (count === 2 && raw > 2147483647) raw -= 4294967296; */
        
        this.log.debug('Spit result Hex'+result[6]);
        
		return ( result[1] === '05') ? 0 : parseInt(result[6], 16);

	}

    /**
     * Konvertiert den Rohwert (Hex-String) in den richtigen Wert
     */
    _convertRawValue(rawHex, dp) {
        if (!rawHex) return null;

        // Hex → Integer
        let raw = this._splitResponse(rawHex)

        
        // Sonderfall Boolean
        if ((dp.ioType || '').toLowerCase() === 'boolean') {
            return raw !== 0;
        }

        // Auflösung anwenden
        const factor = this._getResolutionFactor(dp);
        if (factor !== 1) {
            return Math.round((raw / factor) * 10) / 10;
        }

        return raw;
    }

    /**
     * Ermittelt den Auflösungsfaktor
     * "0.1 °C" → 10, "0.01 bar" → 100, sonst 1
     */
    _getResolutionFactor(dp) {
        const res = (dp.resolution || '').toLowerCase();

        if (res.startsWith('0.01') || res.startsWith('0,01')) return 100;
        if (res.startsWith('0.1')  || res.startsWith('0,1'))  return 10;

        return 1;
    }

    /**
     * HTTP POST Request
     * @returns {Promise<string>} Response-Body
     */
    _httpPost(payload) {
        return new Promise((resolve, reject) => {
            const bodyBuffer = Buffer.from(payload, 'utf8');

            const options = {
                hostname: this.host,
                port:     this.port,
                path:     '/ajax/CanApiJson.json',
                method:   'POST',
                headers:  {
                    'Content-Type':   'application/json',
                    'Content-Length': bodyBuffer.length,
                    'Accept':         'application/json',
                }
            };

            // HTTP-Authentifizierung
            if (this.username && this.password) {
                const auth = Buffer.from(
                    `${this.username}:${this.password}`
                ).toString('base64');
                options.headers['Authorization'] = `Basic ${auth}`;
            }

            const lib = this.port === 443 ? https : http;

            const req = lib.request(options, (res) => {
                let data = '';

                res.on('data', chunk => { data += chunk; });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(
                            `HTTP ${res.statusCode}: ${res.statusMessage}`
                        ));
                    }
                });
            });

            req.on('error',   err => reject(err));
            req.on('timeout', ()  => {
                req.destroy();
                reject(new Error(`Timeout nach ${this.timeout}ms`));
            });

            req.setTimeout(this.timeout);
            req.write(bodyBuffer);
            req.end();
        });
        
    }

    // ─────────────────────────────────────────────────────────────
    // Hilfsmethoden
    // ─────────────────────────────────────────────────────────────

    _toHex(value, bits) {
        return (value >>> 0).toString(16).toUpperCase().padStart(bits*2, '0');
    }

    _chunkArray(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
}

module.exports = CanApiClient;