'use strict';

/*
 * Created with @iobroker/create-adapter v3.1.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const CanApiClient = require('./lib/canApiClient');
const CsvParser    = require('./lib/csvParser');

// Load your modules here, e.g.:
// const fs = require('fs');

class WemCanapi extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	constructor(options) {
		super({
			...options,
			name: 'wem-canapi',
		});
		  /** @type {CanApiClient|null} */
        this.client  = null;

        /** @type {Map<string, object>}  id → Datenpunkt */
        this.dpMap   = new Map();

        /** @type {Map<number, object[]>} interval(s) → Datenpunkte */
        this.groups  = new Map();

        /** @type {Map<number, ioBroker.Interval>} */
        this.timers  = new Map();
        this.timercounter = 0;
        this.timerrunning = false;
        

        this.on('ready',       this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message',     this.onMessage.bind(this));
        this.on('unload',      this.onUnload.bind(this));
    }

	

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		  await this.setState('info.connection', false, true);
          

        const cfg = this.config;
        if (!cfg.host) {
            this.log.error('Kein Host konfiguriert!');
            return;
        }

        // Datenpunkte vorbereiten
        const imported = cfg.importedDatapoints  || [];
        const selected = cfg.selectedDatapoints  || [];

        if (selected.length === 0) {
            this.log.warn('Keine Datenpunkte ausgewählt.');
            return;
        }

        // Map aufbauen
        for (const dp of imported) {
            this.dpMap.set(dp.id, dp);
        }

        // HTTP-Client erstellen
        this.client = new CanApiClient({
            host:     cfg.host,
            port:     cfg.port     || 80,
            username: cfg.username || 'admin',
            password: cfg.password || 'Admin123',
            timeout:  cfg.timeout  || 5000,
            log:      this.log,
        });

        // Verbindung testen
        const ok = await this.client.testConnection();
        await this.setState('info.connection', ok, true);

        if (!ok) {
            this.log.warn(`Keine Verbindung zu ${cfg.host}:${cfg.port || 80}`);
            // Trotzdem versuchen (Gerät könnte kurz offline sein)
        }

        // Objekte anlegen
        const activeDPs = selected
            .map(id => this.dpMap.get(id))
            .filter(Boolean);
        await this._createSyncState();
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
            /* for (const t of this.timers.values()) this.clearInterval(t);
            this.timers.clear();
            await this.setState('info.connection', false, true); */
           if (this.timerId) {
        this.clearTimeout(this.timerId);
            await this.setState('info.connection', false, true);
           }
            callback();
    //}
        } catch (_) { /* ignore */ }
        callback();
	}

	// ─────────────────────────────────────────────────────────────
    // State-Änderungen (schreibbare Datenpunkte)
    // ─────────────────────────────────────────────────────────────

    async onStateChange(id, state) {
        if (!state || state.ack) return;

        // ioBroker-ID → Datenpunkt finden
        const localId = id.replace(`${this.namespace}.`, '');

        for (const dp of this.dpMap.values()) {
            if (dp.treePath !== localId) continue;
            if (!dp.canWrite) {
                this.log.warn(`${dp.registerName} ist nicht schreibbar`);
                return;
            }

            this.log.info(`Schreibe ${state.val} → ${dp.registerName}`);
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
        if (!obj?.command) return;

        switch (obj.command) {

            // ── CSV parsen ───────────────────────────────────────
            case 'parseCSV': {
                try {
                    const parser = new CsvParser();
                    const dps    = parser.parse(obj.message.csvContent);
                    this._respond(obj, { result: dps, error: null });
                } catch (e) {
                    this._respond(obj, { result: null, error: e.message });
                }
                break;
            }

            // ── Verbindungstest ──────────────────────────────────
            case 'testConnection': {
                try {
                    const testClient = new CanApiClient({
                        host:     obj.message.host,
                        port:     obj.message.port || 80,
                        username: obj.message.username || '',
                        password: obj.message.password || '',
                        log:      this.log,
                    });
                    const ok = await testClient.testConnection();
                    this._respond(obj, { result: ok, error: ok ? null : 'Verbindung fehlgeschlagen' });
                } catch (e) {
                    this._respond(obj, { result: false, error: e.message });
                }
                break;
            }
        }
    }

    _respond(obj, data) {
        if (obj.callback) this.sendTo(obj.from, obj.command, data, obj.callback);
    }

    // ─────────────────────────────────────────────────────────────
    // Objekte anlegen
    // ─────────────────────────────────────────────────────────────
    async _createSyncState(){
        // State anlegen if Sync is running
           
            
            await this.setObjectNotExistsAsync('info.syncrunnig', {
                type:   'state',
                common: {
                name:  'Sync is running',
                desc:  'Enshure only one request is send to WTC',
                type:  'boolean',
                role:  'indicator',
                def: false,
                read:  true,
                write: false,
            },
                native: {},
            });
    }
    async _createObjects(datapoints) {
        for (const dp of datapoints) {
            // Channel-Hierarchie anlegen
            const parts = dp.treePath.split('.');
            let path    = '';

            for (let i = 0; i < parts.length - 1; i++) {
                path = path ? `${path}.${parts[i]}` : parts[i];
                await this.setObjectNotExistsAsync(path, {
                    type:   'channel',
                    common: { name: parts[i] },
                    native: {},
                });
            }

            // State anlegen
            const common = {
                name:  dp.pointName || dp.deviceName,
                desc:  `${dp.deviceName}: ${dp.pointName}`,
                type:  dp.ioType || 'number',
                role:  this._role(dp),
                read:  true,
                write: dp.canWrite || false,
                unit:  dp.unit || '',
            };

            if (dp.enumValues) common.states = dp.enumValues;
            if (dp.unit === '°C') { common.min = -50; common.max = 150; }

            await this.setObjectNotExistsAsync(dp.treePath, {
                type:   'state',
                common,
                native: {
                    id:              dp.id
                },
            });
        }
    }

    _role(dp) {
        const dt = (dp.dataType || '').toLowerCase();
        if (dt.includes('temperatur')) return dp.canWrite ? 'level.temperature' : 'value.temperature';
        if (dt.includes('boolesch'))   return dp.canWrite ? 'switch'            : 'indicator';
        if (dt.includes('leistung'))   return 'value.power';
        if (dt.includes('druck'))      return 'value.pressure';
        if (dt.includes('prozent'))    return 'level';
        if (dt.includes('tageszeit'))  return 'value.time';
        if (dt.includes('datum'))      return 'value.date';
        return dp.canWrite ? 'level' : 'value';
    }

    // ─────────────────────────────────────────────────────────────
    // Polling
    // ─────────────────────────────────────────────────────────────

    _buildGroups(datapoints) {
        this.groups.clear();
        for (const dp of datapoints) {
            const iv = dp.updateInterval || 60;
            if (!this.groups.has(iv)) this.groups.set(iv, []);
            this.groups.get(iv).push(dp);
        }
    }

    _startPolling() {
         this.timerId = this.setTimeout(() => {
                    this._doRefresh();
                }, 10000);
       
       
    }
    async _doRefresh(){
        let lastinterval=0;
        try {
        if (!this.timerrunning){
            this.timerrunning=true;
        for (const [interval, dps] of this.groups.entries()) {
            if (lastinterval != interval) {
            if ((this.timercounter * 10000) % interval  === 0 ) {
            this.log.info(
                `Starte Polling: ${dps.length} Datenpunkte alle ${interval}s`
            );
        
            await this._pollGroup(interval, dps);
        //    console.log('debug groups');
            lastinterval=interval;
        }
        }

        }
        this.timercounter= this.timercounter + 1;
        
        
       
    }
     this.timerrunning=false;
        }
        catch {
                 this.log.error(e.message);
        }
        finally{
            this.timerrunning=false;
            this.timerId = this.setTimeout(() => {
                    this._doRefresh();
                }, 10000);
    }
    }

    async _pollGroup(interval, datapoints) {
        this.log.debug(`[Poll ${interval}s] ${datapoints.length} Datenpunkte`);

        try {
            let isrunning=true;
        const state = await this.getStateAsync('info.syncrunnig');
            const now=Date.now();
            //Reset Running State if havent bin runnig for 5 min
            if (state?.ts+300000 <= now ){
                isrunning=false;
            } else {
            isrunning = state?.val;
            }
             if  (!isrunning){
            await this.setState('info.syncrunnig',true,true);
            const results = await this.client.readDatapoints(datapoints);

            let anyOk = false;

            for (const res of results) {
                if (res.value === null) continue;

                const dp = this.dpMap.get(res.id);
                if (!dp) continue;

                await this.setState(dp.treePath, {
                    val: res.value,
                    ack: true,
                    ts:  Date.now(),
                });

                anyOk = true;
            }

            // Verbindungsstatus aktualisieren
            await this.setState('info.connection', anyOk, true);
            await this.setState('info.syncrunnig',false,true);
        }

        } catch (e) {
            this.log.warn(`[Poll ${interval}s] Fehler: ${e.message}`);
            // await this.setState('info.connection', false, true);
        }
}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	module.exports = options => new WemCanapi(options);
} else {
	// otherwise start the instance directly
	new WemCanapi();
}
