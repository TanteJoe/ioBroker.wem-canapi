import React, {
    useState, useEffect, useMemo, useCallback, useRef
} from 'react';
import { parseCSV, type Datapoint } from '../lib/csvParser';
import {downloadCSV, handleDownload} from '../lib/exportCSV';

interface Props {
    native:   Record<string, any>;
    onChange: (key: string, val: any) => void;
}

export default function TabDatapoints({ native, onChange }: Props) {
    const [allDP,       setAllDP]       = useState<Datapoint[]>(
        native.importedDatapoints || []
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(native.selectedDatapoints || [])
    );
    const [search,     setSearch]      = useState('');
    const [filterDev,  setFilterDev]   = useState('');
    const [filterType, setFilterType]  = useState('');
    const [toast,      setToast]       = useState<{msg:string;type:string}|null>(null);
    const [expanded,   setExpanded]    = useState<Record<string,boolean>>({});
    const [dragging,   setDragging]    = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { onChange('selectedDatapoints', [...selectedIds]); }, [selectedIds]);
    useEffect(() => { onChange('importedDatapoints', allDP);            }, [allDP]);
const exportImpotedDatapoints = async => {
    downloadCSV(native.importedDatapoints);
}
    // Filter
    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return allDP.filter(dp => {
            const ms = !s ||
                dp.pointName.toLowerCase().includes(s) ||
                dp.deviceGroupName.toLowerCase().includes(s) ||
                dp.deviceName.toLowerCase().includes(s);
            return ms &&
                (!filterDev  || dp.deviceName === filterDev) &&
                (!filterType || dp.dataType   === filterType);
        });
    }, [allDP, search, filterDev, filterType]);

    const devices = useMemo(() =>
        [...new Set(allDP.map(d => d.deviceName).filter(Boolean))].sort(), [allDP]);
    const types = useMemo(() =>
        [...new Set(allDP.map(d => d.dataType).filter(Boolean))].sort(), [allDP]);

    // Baum
    const tree = useMemo(() => {
        const s: Record<string, Record<string, Record<string, Datapoint[]>>> = {};
        for (const dp of filtered) {
            const t = dp.deviceGroupName   || '?';
            const n = dp.deviceName   || '?';
            const r = dp.pointName || '?';
            if (!s[t])       s[t]    = {};
            if (!s[t][n])    s[t][n] = {};
            if (!s[t][n][r]) s[t][n][r] = [];
            s[t][n][r].push(dp);
        }
        return s;
    }, [filtered]);

    const stats = useMemo(() => {
        const sel = [...selectedIds].filter(id => allDP.find(d => d.id === id));
        const rw  = sel.filter(id => allDP.find(d => d.id === id)?.canWrite).length;
        return { total: allDP.length, sel: sel.length, rw, ro: sel.length - rw };
    }, [allDP, selectedIds]);

    // CSV Import
    const handleFile = useCallback((file: File) => {
        showToast(`Lese "${file.name}"…`, 'info');
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const dps = parseCSV(ev.target?.result as string);
                if (!dps.length) { showToast('Keine Datenpunkte gefunden', 'error'); return; }
                setAllDP(dps);
                const ids = new Set(dps.map(d => d.id));
                setSelectedIds(prev => new Set([...prev].filter(id => ids.has(id))));
                showToast(`✅ ${dps.length} Datenpunkte importiert`, 'ok');
            } catch(e: any) {
                showToast(`❌ ${e.message}`, 'error');
            }
        };
        reader.readAsText(file, 'utf-8');
    }, []);

    const toggleDP = useCallback((id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    }, []);

    const selectAll   = () => setSelectedIds(prev => { const n=new Set(prev); filtered.forEach(dp=>n.add(dp.id));    return n; });
    const deselectAll = () => setSelectedIds(prev => { const n=new Set(prev); filtered.forEach(dp=>n.delete(dp.id)); return n; });
    const toggleNode  = (key: string) => setExpanded(prev => ({...prev, [key]: !prev[key]}));
    const collapseAll = () => setExpanded({});

    function showToast(msg: string, type: string) {
        setToast({ msg, type });
        if (type !== 'info') setTimeout(() => setToast(null), 4000);
    }

    return (
        <div>
            <div>
            <button
                        onClick={handleDownload}
                        style={{
                            padding:'9px 24px', border:'none',
                            borderRadius:4, fontSize:14,
                            background:'#757575', color:'#fff', cursor:'pointer',
                        }}
                    >
                        📥 Download ExampleCSV
                    </button>
                    <button
                        onClick={exportImpotedDatapoints}
                        style={{
                            padding:'9px 24px', border:'none',
                            borderRadius:4, fontSize:14,
                            background:'#757575', color:'#fff', cursor:'pointer',
                        }}
                    >
                        ⬇ Download CurrentDatapoints as CSV
                    </button>
            </div>
            {/* Upload */}
            <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                    e.preventDefault(); setDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                }}
                style={{
                    border: `2px dashed ${dragging ? '#0d47a1' : '#1976d2'}`,
                    borderRadius: 8, padding: '24px 16px', textAlign: 'center',
                    cursor: 'pointer', background: dragging ? '#ddeeff' : '#f0f7ff',
                    marginBottom: 14, transition: 'all .2s', userSelect: 'none',
                }}
            >
                <div style={{ fontSize: 36 }}>📂</div>
                <div style={{ fontWeight: 600, margin: '6px 0 2px' }}>
                    CAN-API CSV importieren
                </div>
                <div style={{ fontSize: 12, color: '#777' }}>
                    Klicken oder Datei hierher ziehen (canapi.csv)
                </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt"
                   style={{ display:'none' }}
                   onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=''; }}/>

            {/* Toast */}
            {toast && (
                <div style={{
                    padding: '10px 14px', borderRadius: 4,
                    marginBottom: 10, fontSize: 13,
                    border: '1px solid',
                    ...(toast.type==='ok'
                        ? {background:'#e8f5e9',color:'#2e7d32',borderColor:'#a5d6a7'}
                        : toast.type==='error'
                        ? {background:'#ffebee',color:'#c62828',borderColor:'#ef9a9a'}
                        : {background:'#e3f2fd',color:'#1565c0',borderColor:'#90caf9'}),
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
                <input type="text" placeholder="🔍 Suchen…" value={search}
                       onChange={e => setSearch(e.target.value)}
                       style={{ flex:1, minWidth:160, padding:'7px 12px', border:'1px solid #ccc', borderRadius:4, fontSize:13, outline:'none' }}/>
                <select value={filterDev} onChange={e => setFilterDev(e.target.value)}
                        style={{ padding:'7px 10px', border:'1px solid #ccc', borderRadius:4, fontSize:13, background:'#fff' }}>
                    <option value="">Alle Geräte</option>
                    {devices.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        style={{ padding:'7px 10px', border:'1px solid #ccc', borderRadius:4, fontSize:13, background:'#fff' }}>
                    <option value="">Alle Typen</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {[
                    { label:'✓ Alle', color:'#388e3c', fn:selectAll },
                    { label:'✗ Keine', color:'#d32f2f', fn:deselectAll },
                    { label:'▶ Einklappen', color:'#616161', fn:collapseAll },
                ].map(b => (
                    <button key={b.label} onClick={b.fn} style={{
                        padding:'7px 12px', border:'none', borderRadius:4,
                        cursor:'pointer', fontSize:13, fontWeight:500,
                        background:b.color, color:'#fff',
                    }}>{b.label}</button>
                ))}
            </div>

            {/* Stats */}
            <div style={{
                display:'flex', gap:20, flexWrap:'wrap',
                padding:'8px 14px', background:'#f5f5f5',
                border:'1px solid #e0e0e0', borderRadius:4, marginBottom:10,
            }}>
                {[
                    {label:'Importiert', val:stats.total},
                    {label:'Ausgewählt', val:stats.sel},
                    {label:'R/W',        val:stats.rw},
                    {label:'R/O',        val:stats.ro},
                ].map(s => (
                    <span key={s.label} style={{fontSize:12,color:'#555'}}>
                        {s.label}: <b style={{color:'#111'}}>{s.val}</b>
                    </span>
                ))}
            </div>

            {/* Baum */}
            <div style={{
                border:'1px solid #ddd', borderRadius:4,
                maxHeight:'calc(100vh - 400px)', minHeight:200,
                overflowY:'auto', background:'#fff',
            }}>
                {filtered.length === 0 ? (
                    <div style={{ padding:40, textAlign:'center', color:'#aaa', fontSize:15 }}>
                        {allDP.length === 0
                            ? '📂 Bitte importieren Sie eine CSV-Datei'
                            : '🔍 Keine Datenpunkte gefunden'}
                    </div>
                ) : (
                    Object.entries(tree).map(([devType, devNames]) => {
                        const tk   = `T_${devType}`;
                        const tExp = !!expanded[tk];
                        const tCnt = Object.values(devNames)
                            .flatMap(n => Object.values(n).flat()).length;
                        return (
                            <div key={devType}>
                                <NodeHdr icon="📦" label={devType} count={tCnt}
                                         expanded={tExp} depth={0}
                                         onClick={() => toggleNode(tk)}/>
                                {tExp && Object.entries(devNames).map(([devName, regNames]) => {
                                    const nk   = `N_${devType}_${devName}`;
                                    const nExp = !!expanded[nk];
                                    const nCnt = Object.values(regNames).flat().length;
                                    return (
                                        <div key={devName}>
                                            <NodeHdr icon="🏠" label={devName} count={nCnt}
                                                     expanded={nExp} depth={1}
                                                     onClick={() => toggleNode(nk)}/>
                                            {nExp && Object.entries(regNames).map(([regName, dparr]) => {
                                                if (dparr.length === 1) {
                                                    return (
                                                        <DPRow key={dparr[0].id}
                                                               dp={dparr[0]}
                                                               selected={selectedIds.has(dparr[0].id)}
                                                               depth={2}
                                                               onChange={toggleDP}/>
                                                    );
                                                }
                                                const rk   = `R_${devType}_${devName}_${regName}`;
                                                const rExp = !!expanded[rk];
                                                return (
                                                    <div key={regName}>
                                                        <NodeHdr icon="📋" label={regName}
                                                                 count={dparr.length}
                                                                 expanded={rExp} depth={2}
                                                                 onClick={() => toggleNode(rk)}/>
                                                        {rExp && dparr.map(dp => (
                                                            <DPRow key={dp.id} dp={dp}
                                                                   selected={selectedIds.has(dp.id)}
                                                                   depth={3}
                                                                   onChange={toggleDP}/>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// ── Sub-Komponenten ──────────────────────────────────────────────

function NodeHdr({ icon, label, count, expanded, depth, onClick }: {
    icon: string; label: string; count: number;
    expanded: boolean; depth: number; onClick: () => void;
}) {
    const bg = depth===0 ? '#f0f0f0' : depth===1 ? '#f8f8f8' : '#fff';
    return (
        <div onClick={onClick} style={{
            display:'flex', alignItems:'center',
            padding:`7px 12px 7px ${12+depth*22}px`,
            cursor:'pointer', borderBottom:'1px solid #eee',
            background:bg, userSelect:'none',
        }}>
            <span style={{fontSize:10,color:'#999',width:14}}>
                {expanded ? '▼' : '▶'}
            </span>
            <span style={{margin:'0 6px'}}>{icon}</span>
            <span style={{flex:1,fontWeight:depth<2?600:500,fontSize:depth===0?14:13}}>
                {label}
            </span>
            <span style={{
                fontSize:11,padding:'1px 8px',borderRadius:10,
                background:'#e3f2fd',color:'#1565c0',
            }}>
                {count}
            </span>
        </div>
    );
}

function DPRow({ dp, selected, depth, onChange }: {
    dp: Datapoint; selected: boolean;
    depth: number; onChange: (id:string, v:boolean) => void;
}) {
    return (
        <div style={{
            display:'flex', alignItems:'center',
            padding:`5px 12px 5px ${12+depth*22}px`,
            borderBottom:'1px solid #f5f5f5',
            background: selected ? '#f1f8e9' : '#fff',
        }}>
            <input type="checkbox" checked={selected}
                   onChange={e => onChange(dp.id, e.target.checked)}
                   onClick={e => e.stopPropagation()}
                   style={{
                       width:15,height:15,marginRight:10,
                       cursor:'pointer',accentColor:'#388e3c',flexShrink:0,
                   }}/>
            <div style={{flex:1,overflow:'hidden'}}>
                <div style={{
                    fontWeight:500,fontSize:13,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                }}>
                    {dp.pointName || dp.deviceGroupName}
                </div>
                <div style={{fontSize:11,color:'#999',marginTop:1}}>
                    0x{dp.deviceGroupName.toUpperCase()} •
                    FC{dp.deviceName} •
                    {dp.dataType}
                    {dp.resolution ? ` • ${dp.resolution}` : ''}
                    {dp.unit ? ` → ${dp.unit}` : ''}
                </div>
            </div>
            <div style={{display:'flex',gap:4,marginLeft:8}}>
                {[
                    { bg: dp.canWrite?'#fff8e1':'#e3f2fd',
                      fg: dp.canWrite?'#e65100':'#1565c0',
                      text: dp.canWrite?'R/W':'R/O' },
                    { bg:'#f3e5f5', fg:'#6a1b9a',
                      text: fmtIvl(dp.updateInterval) },
                    ...(dp.enumValues
                        ? [{ bg:'#e8f5e9', fg:'#2e7d32', text:'ENUM' }]
                        : []),
                ].map((b,i) => (
                    <span key={i} style={{
                        padding:'2px 6px',borderRadius:10,
                        fontSize:10,fontWeight:700,
                        background:b.bg,color:b.fg,
                    }}>
                        {b.text}
                    </span>
                ))}
            </div>
        </div>
    );
}

const fmtIvl = (s: number) => {
    if (!s)     return '?';
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.round(s/60)}min`;
    return `${Math.round(s/3600)}h`;
};