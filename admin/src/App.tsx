import React, { useState, useEffect, useCallback } from 'react';
import { connectToSocket, getObject, setObject, extendObject } from './lib/socket';
import TabConnection from './components/TabConnection';
import TabDatapoints from './components/TabDatapoints';

interface NativeConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	timeout: number;
	selectedDatapoints: string[];
	importedDatapoints: any[];
}

const DEFAULTS: NativeConfig = {
	host: '',
	port: 80,
	username: '',
	password: '',
	timeout: 5000,
	selectedDatapoints: [],
	importedDatapoints: [],
};

function Tabs({ active, onChange }: { active: number; onChange: (i: number) => void }) {
	const tabs = ['🔌 Verbindung', '📋 Datenpunkte'];
	return (
		<div style={{ display: 'flex', borderBottom: '2px solid #1976d2', marginBottom: 24 }}>
			{tabs.map((tab, i) => (
				<button
					key={i}
					onClick={() => onChange(i)}
					style={{
						padding: '10px 24px',
						border: 'none',
						borderRadius: '4px 4px 0 0',
						cursor: 'pointer',
						fontSize: 14,
						marginRight: 4,
						transition: 'all .2s',
						fontWeight: i === active ? 600 : 400,
						background: i === active ? '#1976d2' : '#f0f0f0',
						color: i === active ? '#fff' : '#555',
					}}
				>
					{tab}
				</button>
			))}
		</div>
	);
}

export default function App() {
	const [socket, setSocket] = useState<any>(null);
	const [instance, setInstance] = useState(0);
	const [native, setNative] = useState<NativeConfig>(DEFAULTS);
	const [loading, setLoading] = useState(true);
	const [sockStatus, setSockStatus] = useState('⏳ Verbinde mit ioBroker…');
	const [dirty, setDirty] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState(0);

	useEffect(() => {
		// Instanz aus URL
		const params = new URLSearchParams(window.location.search);
		const inst = parseInt(params.get('instance') || '0', 10);
		setInstance(inst);

		// Socket verbinden
		setSockStatus('⏳ Lade socket.io…');
		connectToSocket(sock => {
			console.log('[WEM App] Socket erhalten');
			setSockStatus('✅ Socket verbunden');
			setSocket(sock);

			// Konfiguration laden
			setSockStatus('⏳ Lade Konfiguration…');
			sock.emit('getObject', `system.adapter.wem-canapi.${inst}`, (err: any, obj: any) => {
				if (!err && obj?.native) {
					setNative({ ...DEFAULTS, ...obj.native });
					setSockStatus('');
				} else {
					console.error('[WEM] getObject Fehler:', err);
					setSockStatus('⚠️ Konfiguration konnte nicht geladen werden');
				}
				setLoading(false);
			});
		});
	}, []);

	const updateNative = useCallback((key: string, val: any) => {
		setNative(prev => ({ ...prev, [key]: val }));
		setDirty(true);
	}, []);

	async function handleSave() {
		if (!socket) {
			setSaveMsg('❌ Kein Socket');
			return;
		}
		setSaving(true);
		setSaveMsg('⏳ Speichern…');
		try {
			const obj = await getObject(socket, `system.adapter.wem-canapi.${instance}`);
			if (!obj) {
				throw new Error('Objekt nicht gefunden');
			}
			obj.native = { ...obj.native, ...native };
			await setObject(socket, `system.adapter.wem-canapi.${instance}`, obj);
			setDirty(false);
			setSaveMsg('✅ Gespeichert!');
			setTimeout(() => setSaveMsg(''), 3000);
			// Adapter neu starten
			setTimeout(async () => {
				try {
					await extendObject(socket, `system.adapter.wem-canapi.${instance}`, { common: { enabled: false } });
					setTimeout(async () => {
						await extendObject(socket, `system.adapter.wem-canapi.${instance}`, {
							common: { enabled: true },
						});
					}, 1500);
				} catch (e) {
					console.log(e.message);
				}
			}, 500);
		} catch (e: any) {
			setSaveMsg(`❌ ${e.message}`);
		}
		setSaving(false);
	}

	// ── Loading Screen ───────────────────────────────────────────
	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: '60vh',
					gap: 16,
					color: '#666',
				}}
			>
				<div
					style={{
						width: 36,
						height: 36,
						border: '4px solid #e0e0e0',
						borderTop: '4px solid #1976d2',
						borderRadius: '50%',
						animation: 'spin 1s linear infinite',
					}}
				/>
				<div style={{ fontSize: 14 }}>{sockStatus}</div>
			</div>
		);
	}

	// ── Render ───────────────────────────────────────────────────
	return (
		<div style={{ padding: 16, paddingBottom: 80 }}>
			{/* Header */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
				<span style={{ fontSize: 22 }}>🔥</span>
				<span style={{ fontSize: 18, fontWeight: 700, color: '#1a237e' }}>Weishaupt CAN-API</span>
				{sockStatus && <span style={{ fontSize: 12, color: '#666' }}>{sockStatus}</span>}
				{dirty && (
					<span
						style={{
							fontSize: 12,
							color: '#e65100',
							background: '#fff8e1',
							padding: '3px 10px',
							borderRadius: 10,
							border: '1px solid #ffe082',
						}}
					>
						● Nicht gespeichert
					</span>
				)}
			</div>

			{/* Tabs */}
			<Tabs
				active={activeTab}
				onChange={setActiveTab}
			/>

			{/* Tab Inhalt */}
			{activeTab === 0 && (
				<TabConnection
					native={native}
					socket={socket}
					instance={instance}
					onChange={updateNative}
				/>
			)}
			{activeTab === 1 && (
				<TabDatapoints
					native={native}
					onChange={updateNative}
				/>
			)}

			{/* Save Bar */}
			<div
				style={{
					position: 'fixed',
					bottom: 0,
					left: 0,
					right: 0,
					background: '#fff',
					borderTop: '2px solid #e0e0e0',
					padding: '12px 24px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					boxShadow: '0 -4px 12px rgba(0,0,0,.1)',
					zIndex: 9999,
				}}
			>
				<span style={{ fontSize: 13, color: '#666', minWidth: 200 }}>{saveMsg}</span>
				<div style={{ display: 'flex', gap: 10 }}>
					<button
						onClick={handleSave}
						disabled={!dirty || saving || !socket}
						style={{
							padding: '9px 24px',
							border: 'none',
							borderRadius: 4,
							fontSize: 14,
							fontWeight: 600,
							color: '#fff',
							cursor: dirty && !saving && socket ? 'pointer' : 'not-allowed',
							background: dirty && !saving && socket ? '#388e3c' : '#bdbdbd',
						}}
					>
						💾 Speichern
					</button>
					<button
						onClick={() => window.history.back()}
						style={{
							padding: '9px 24px',
							border: 'none',
							borderRadius: 4,
							fontSize: 14,
							background: '#757575',
							color: '#fff',
							cursor: 'pointer',
						}}
					>
						✕ Schließen
					</button>
				</div>
			</div>
		</div>
	);
}
