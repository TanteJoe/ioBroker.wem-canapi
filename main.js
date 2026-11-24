'use strict';

/*
 * Created with @iobroker/create-adapter v3.1.5
 */
import CanApiClient from './lib/canApiClient.js';
// @ts-expect-error adapter-core is supplied by the ioBroker runtime and may be absent in editor-only environments.
import { Adapter } from '@iobroker/adapter-core';

class WemCanapi extends Adapter {
	/**
	 * @param {object} [options] - Adapter options
	 */
	constructor(options) {
		super({
			...options,
			name: 'wem-canapi',
		});
		this.client = null;

		/** id → Datenpunkt */
		this.dpMap = new Map();

		/** interval(s) → Datenpunkte */
		this.groups = new Map();

		this.timers = new Map();
		this.timercounter = 0;
		this.timerrunning = false;

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		await this.setStateAsync('info.connection', false, true);

		const cfg = this.config;
		if (!cfg.host) {
			this.log.error('Kein Host konfiguriert!');
			return;
		}

		// Datenpunkte vorbereiten
		const imported = cfg.importedDatapoints || [];
		const selected = cfg.selectedDatapoints || [];

		if (selected.length === 0) {
			this.log.warn('Keine Datenpunkte ausgewählt.');
			return;
		}

		// Map aufbauen
		for (const dp of imported) {
			this.dpMap.set(dp.id, dp);
		}

		if (!cfg.username || !cfg.password) {
			this.log.warn('Benutzername oder Passwort nicht konfiguriert - Anfrage erfolgt ohne Authentifizierung.');
		}

		// HTTP-Client erstellen
		this.client = new CanApiClient({
			host: cfg.host,
			port: cfg.port || 80,
			username: cfg.username || '',
			password: cfg.password || '',
			timeout: cfg.timeout || 5000,
			log: this.log,
			adapter: this,
		});

		// Verbindung testen
		const ok = await this.client.testConnection();
		await this.setState('info.connection', ok, true);

		if (!ok) {
			this.log.warn(`Keine Verbindung zu ${cfg.host}:${cfg.port || 80}`);
			// Trotzdem versuchen (Gerät könnte kurz offline sein)
		}

		// Objekte anlegen
		const activeDPs = selected.map(id => this.dpMap.get(id)).filter(Boolean);
		await this._createSyncState();
		await this._createResetObject();
		await this._createObjects(activeDPs);
		await this.subscribeStatesAsync('*');

		// Polling starten
		this._buildGroups(activeDPs);
		this._startPolling();
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param {() => void} callback - Callback function
	 */
	async onUnload(callback) {
		try {
			if (this.timerId) {
				this.clearTimeout(this.timerId);
			}
			await this.setState('info.connection', false, true);
		} catch (e) {
			this.log.debug(`Error on stopping ${e.message}`);
		} finally {
			callback();
		}
	}

	// ─────────────────────────────────────────────────────────────
	// State-Änderungen (schreibbare Datenpunkte)
	// ─────────────────────────────────────────────────────────────

	async onStateChange(id, state) {
		if (!state || state.ack) {
			return;
		}

		// ioBroker-ID → Datenpunkt finden
		const localId = id.replace(`${this.namespace}.`, '');
		if ('info.ResetAllObjects' === localId && state.val === true) {
			this.log.info('Reset All Objects');
			await this._resetObj(this.dpMap.values());
			await this.setState(localId, { val: false, ack: true });
			return;
		}

		for (const dp of this.dpMap.values()) {
			if (dp.treePath !== localId) {
				continue;
			}
			if (!dp.canWrite) {
				this.log.warn(`${dp.pointName} ist nicht schreibbar`);
				return;
			}

			this.log.info(`Schreibe ${state.val} → ${dp.pointName} `);
			const ok = await this.client.writeDatapoint(dp, state.val);

			if (ok) {
				await this.setState(localId, { val: state.val, ack: true });
			}
			return;
		}
	}

	// ─────────────────────────────────────────────────────────────
	// Admin-Messages (CSV-Import, Verbindungstest)
	// ─────────────────────────────────────────────────────────────

	async onMessage(obj) {
		this.log.debug('========================================');
		this.log.debug('MESSAGE RECEIVED IN ADAPTER!');
		this.log.debug(`Command:${obj.command}`);
		this.log.debug(`Data:${obj.message}`);
		this.log.debug('========================================');
		if (!obj?.command) {
			return;
		}

		switch (obj.command) {
			// ── Verbindungstest ──────────────────────────────────
			case 'testConnection': {
				try {
					const testClient = new CanApiClient({
						host: obj.message.host,
						port: obj.message.port || 80,
						username: obj.message.username || '',
						password: obj.message.password || '',
						log: this.log,
						adapter: this,
					});
					this.log.debug('Testing Connection from AdminGUI');
					const ok = await testClient.testConnection();
					this._respond(obj, { result: ok, error: ok ? null : 'Connection failed' });
				} catch (e) {
					this._respond(obj, { result: false, error: e.message });
				}
				break;
			}
		}
	}

	_respond(obj, data) {
		if (obj.callback) {
			this.sendTo(obj.from, obj.command, data, obj.callback);
		}
	}

	// ─────────────────────────────────────────────────────────────
	// Objekte anlegen
	// ─────────────────────────────────────────────────────────────
	async _createSyncState() {
		// State anlegen if Sync is running

		await this.setObjectNotExistsAsync('info.syncrunnig', {
			type: 'state',
			common: {
				name: 'Sync is running',
				desc: 'Enshure only one request is send to WTC',
				type: 'boolean',
				role: 'indicator',
				def: false,
				read: true,
				write: false,
			},
			native: {},
		});
	}
	async _createResetObject() {
		// State anlegen if Sync is running

		await this.setObjectNotExistsAsync('info.ResetAllObjects', {
			type: 'state',
			common: {
				name: 'Reset All Objects',
				desc: 'Reset error counts for all objects',
				type: 'boolean',
				role: 'button',
				def: false,
				read: true,
				write: true,
			},
			native: {},
		});
	}
	async _createObjects(datapoints) {
		for (const dp of datapoints) {
			// Channel-Hierarchie anlegen
			const parts = dp.treePath.split('.');
			let path = '';

			for (let i = 0; i < parts.length - 1; i++) {
				path = path ? `${path}.${parts[i]}` : parts[i];
				await this.setObjectNotExistsAsync(path, {
					type: 'channel',
					common: { name: parts[i] },
					native: {},
				});
			}

			// State anlegen
			const common = {
				name: dp.pointName || dp.deviceName,
				desc: `${dp.deviceName}: ${dp.pointName}`,
				type: CanApiClient.ioType(dp),
				role: this._role(dp),
				read: true,
				write: dp.canWrite || false,
				unit: dp.unit || '',
			};

			if (dp.enumValues) {
				common.states = dp.enumValues;
			}
			if (dp.unit === '°C') {
				common.min = -50;
				common.max = 80;
			}

			await this.setObjectNotExistsAsync(dp.treePath, {
				type: 'state',
				common,
				native: {
					id: dp.id,
				},
			});
		}
	}

	_role(dp) {
		const dt = (dp.dataType || '').toLowerCase();
		if (dt.includes('temperatur')) {
			return dp.canWrite ? 'level.temperature' : 'value.temperature';
		}
		if (dt.includes('boolesch')) {
			return dp.canWrite ? 'switch' : 'indicator';
		}
		if (dt.includes('leistung')) {
			return 'value.power';
		}
		if (dt.includes('druck')) {
			return 'value.pressure';
		}
		if (dt.includes('prozent')) {
			return 'level';
		}
		if (dt.includes('tageszeit')) {
			return 'value.time';
		}
		if (dt.includes('datum')) {
			return 'value.date';
		}
		return dp.canWrite ? 'level' : 'value';
	}

	// ─────────────────────────────────────────────────────────────
	// Polling
	// ─────────────────────────────────────────────────────────────

	_buildGroups(datapoints) {
		this.groups.clear();
		for (const dp of datapoints) {
			const iv = dp.updateInterval || 60;
			if (!this.groups.has(iv)) {
				this.groups.set(iv, []);
			}
			this.groups.get(iv).push(dp);
		}
	}

	_startPolling() {
		this.timerId = this.setTimeout(() => {
			this._doRefresh();
		}, 10000);
	}
	async _doRefresh() {
		let lastinterval = 0;
		try {
			if (!this.timerrunning) {
				this.timerrunning = true;
				for (const [interval, dps] of this.groups.entries()) {
					if (lastinterval != interval) {
						if ((this.timercounter * 10) % interval === 0) {
							this.log.debug(`Starte Polling: ${dps.length} Datenpunkte alle ${interval}s`);

							await this._pollGroup(interval, dps);
							//    console.log('debug groups');
							lastinterval = interval;
						}
					}
				}
				this.timercounter = this.timercounter + 1;
			}
			this.timerrunning = false;
		} catch (e) {
			this.log.error(e.message);
		} finally {
			this.timerrunning = false;
			this.timerId = this.setTimeout(() => {
				this._doRefresh();
			}, 10000);
		}
	}

	async _pollGroup(interval, datapoints) {
		this.log.debug(`[Poll ${interval}s] ${datapoints.length} Datenpunkte`);

		try {
			let isrunning = true;
			const state = await this.getStateAsync('info.syncrunnig');
			const now = Date.now();
			//Reset Running State if havent bin runnig for 5 min
			// @ts-expect-error Fix false was schief geht
			if (state?.ts + 300000 <= now) {
				isrunning = false;
			} else {
				// @ts-expect-error Fix false was schief geht
				isrunning = state?.val;
			}
			if (!isrunning) {
				await this.setState('info.syncrunnig', true, true);
				// @ts-expect-error Client null breits abgefangen
				const results = await this.client.readDatapoints(await this._filterDatapointsOnError(datapoints), this);

				let anyOk = false;

				for (const res of results) {
					if (res.value === null) {
						continue;
					}

					const dp = this.dpMap.get(res.id);
					if (!dp) {
						continue;
					}

					await this.setState(dp.treePath, {
						val: res.value,
						ack: true,
						ts: Date.now(),
					});

					anyOk = true;
				}

				// Verbindungsstatus aktualisieren
				await this.setState('info.connection', anyOk, true);
				await this.setState('info.syncrunnig', false, true);
			} else {
				this.log.warn(`[Poll ${interval}s] Fehler: Sync was allready running`);
			}
		} catch (e) {
			this.log.warn(`[Poll ${interval}s] Fehler: ${e.message}`);
			await this.setState('info.syncrunnig', false, true);
		}
	}
	async _getObj(obj) {
		const returnobj = await this.getObjectAsync(obj);
		return returnobj;
	}
	async _filterDatapointsOnError(datapoints) {
		const filtered = [];
		for (const dp of datapoints) {
			const obj = await this._getObj(dp.treePath);
			if (!obj?.errorcount || obj.errorcount <= 5) {
				filtered.push(dp);
			}
		}

		return filtered;
	}
	async _resetObj(datapoints) {
		for (const dp of datapoints) {
			const obj = await this._getObj(dp.treePath);
			if (obj?.errorcount) {
				obj.common.color = '';
				obj.errorcount = 0;
				await this.setObjectAsync(`${dp.treePath}`, obj);
			}
		}
	}
}
new WemCanapi();
