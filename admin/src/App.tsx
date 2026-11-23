import React from 'react';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { GenericApp, I18n } from '@iobroker/adapter-react-v5';
import type { GenericAppProps, GenericAppState } from '@iobroker/adapter-react-v5';

import TabConnection from './components/TabConnection';
import TabDatapoints from './components/TabDatapoints';

import de from '../i18n/de.json';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import fr from '../i18n/fr.json';
import it from '../i18n/it.json';
import nl from '../i18n/nl.json';
import pl from '../i18n/pl.json';
import pt from '../i18n/pt.json';
import ru from '../i18n/ru.json';
import uk from '../i18n/uk.json';
import zhCn from '../i18n/zh-cn.json';

const DEFAULTS = {
	host: '',
	port: 80,
	username: '',
	password: '',
	timeout: 5000,
	requestArraySize: 6,
	selectedDatapoints: [] as string[],
	importedDatapoints: [] as any[],
};

interface AppState extends GenericAppState {
	activeTab: number;
}

function Tabs({ active, onChange }: { active: number; onChange: (i: number) => void }): React.JSX.Element {
	const tabs = [`🔌 ${I18n.t('tabConnection')}`, `📋 ${I18n.t('tabDatapoints')}`];
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

export default class App extends GenericApp<GenericAppProps, AppState> {
	constructor(props: GenericAppProps) {
		super(props, {
			adapterName: 'wem-canapi',
			// Ersetzt I18n.setTranslations() + I18n.setLanguage(): GenericApp setzt
			// die Sprache aus der Admin-Konfiguration, bevor die App rendert.
			translations: {
				de,
				en,
				es,
				fr,
				it,
				nl,
				pl,
				pt,
				ru,
				uk,
				'zh-cn': zhCn,
			},
			socket: { port: parseInt(window.location.port, 10) },
		});
		this.state = { ...this.state, activeTab: 0 };
	}

	/** Wird von GenericApp aufgerufen, sobald Verbindung steht und die Instanz-Config (native) geladen ist. */
	onConnectionReady(): void {
		// nichts nötig: this.state.native enthält die Konfiguration
	}

	render(): React.JSX.Element {
		if (!this.state.loaded) {
			return super.render();
		}

		const native = { ...DEFAULTS, ...this.state.native };
		const onChange = (key: string, val: any): void => this.updateNativeValue(key, val);

		return (
			<StyledEngineProvider injectFirst>
				<ThemeProvider theme={this.state.theme}>
					<div style={{ padding: 16, paddingBottom: 80 }}>
						{/* Header */}
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
							<span style={{ fontSize: 22 }}>🔥</span>
							<span style={{ fontSize: 18, fontWeight: 700, color: '#1a237e' }}>Weishaupt CAN-API</span>
							{this.state.changed && (
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
									● {I18n.t('notSaved')}
								</span>
							)}
						</div>

						<Tabs
							active={this.state.activeTab}
							onChange={activeTab => this.setState({ activeTab })}
						/>

						{this.state.activeTab === 0 && (
							<TabConnection
								native={native}
								socket={this.socket}
								instance={this.instance}
								onChange={onChange}
								onOpenDatapoints={() => this.setState({ activeTab: 1 })}
							/>
						)}
						{this.state.activeTab === 1 && (
							<TabDatapoints
								native={native}
								onChange={onChange}
							/>
						)}

						{this.renderError()}
						{this.renderToast()}
						{/* ersetzt die selbstgebaute Speichern/Schließen-Leiste */}
						{this.renderSaveCloseButtons()}
					</div>
				</ThemeProvider>
			</StyledEngineProvider>
		);
	}
}
