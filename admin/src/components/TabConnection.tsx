import React, { useState } from 'react';

interface Props {
    native:   Record<string, any>;
    socket:   any;
    instance: number;
    onChange: (key: string, val: any) => void;
}

export default function TabConnection({ native, socket, instance, onChange }: Props) {
    const [status,  setStatus]  = useState('');
    const [testing, setTesting] = useState(false);

    async function testConnection() {
        if (!native.host) { setStatus('⚠️ Bitte Host eingeben'); return; }
        if (!socket)      { setStatus('❌ Kein Socket');          return; }

        setTesting(true);
        setStatus('⏳ Verbinde…');

        socket.emit('sendTo',
            `wem_canapi.${instance}`,
            'testConnection',
            {
                host:     native.host,
                port:     native.port     || 80,
                username: native.username || '',
                password: native.password || '',
            },
            (res: any) => {
                setStatus(res?.result
                    ? '✅ Verbindung erfolgreich!'
                    : `❌ ${res?.error || 'Fehler'}`
                );
                setTesting(false);
            }
        );
    }

    const inp: React.CSSProperties = {
        padding: '8px 12px', border: '1px solid #ccc',
        borderRadius: 4, fontSize: 14, outline: 'none', width: '100%',
    };

    return (
        <div style={{ maxWidth: 700 }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))',
                gap: 16, marginBottom: 20,
            }}>
                {[
                    { id:'host',     label:'Host / IP-Adresse', type:'text',     placeholder:'192.168.1.100', hint:'IP oder Hostname' },
                    { id:'port',     label:'Port',              type:'number',   placeholder:'80',            hint:'HTTP Port (Standard: 80)' },
                    { id:'username', label:'Benutzername',      type:'text',     placeholder:'optional',      hint:'' },
                    { id:'password', label:'Passwort',          type:'password', placeholder:'optional',      hint:'' },
                    { id:'timeout',  label:'Timeout (ms)',      type:'number',   placeholder:'5000',          hint:'HTTP Request Timeout' },
                ].map(f => (
                    <div key={f.id} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'#555', textTransform:'uppercase' }}>
                            {f.label}
                        </label>
                        <input
                            type={f.type}
                            value={native[f.id] ?? (f.type === 'number' ? 0 : '')}
                            placeholder={f.placeholder}
                            onChange={e => onChange(f.id,
                                f.type === 'number'
                                    ? parseInt(e.target.value) || 0
                                    : e.target.value
                            )}
                            style={inp}
                            autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                        />
                        {f.hint && <span style={{ fontSize:11, color:'#999' }}>{f.hint}</span>}
                    </div>
                ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <button
                    onClick={testConnection}
                    disabled={testing || !socket}
                    style={{
                        padding: '9px 18px', border:'none', borderRadius:4,
                        background: testing ? '#90a4ae' : '#1976d2',
                        color:'#fff', fontSize:14, fontWeight:500,
                        cursor: testing ? 'not-allowed' : 'pointer',
                    }}
                >
                    🔍 Verbindung testen
                </button>
                {status && (
                    <span style={{
                        fontSize: 13,
                        color: status.startsWith('✅') ? '#2e7d32' :
                               status.startsWith('❌') ? '#c62828' : '#1565c0',
                    }}>
                        {status}
                    </span>
                )}
            </div>

            <div style={{
                marginTop: 24, padding: '12px 16px',
                background: '#e3f2fd', borderLeft: '4px solid #1976d2',
                borderRadius: '0 4px 4px 0', fontSize: 13, color: '#1565c0',
            }}>
                💡 Datenpunkte werden im Tab <strong>Datenpunkte</strong> konfiguriert.
            </div>
        </div>
    );
}