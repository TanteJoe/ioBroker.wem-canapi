type Callback = (socket: any) => void;

//let _socketInstance: any = null;

export function connectToSocket(callback: Callback): void {
	// Script dynamisch laden - genau wie in der funktionierenden Version
	const script = document.createElement('script');
	script.src = '/socket.io/socket.io.js';

	script.onload = () => {
		console.log('[WEM] socket.io geladen, window.io Typ:', typeof (window as any).io);

		const ioManager = (window as any).io;
		let sock: any = null;

		// Methode 1: io.connect()
		if (ioManager && typeof ioManager.connect === 'function') {
			console.log('[WEM] Nutze io.connect()');
			try {
				sock = ioManager.connect(window.location.origin, {
					path: '/socket.io',
					transports: ['websocket', 'polling'],
				});
			} catch (e: any) {
				console.warn('[WEM] io.connect() Fehler:', e.message);
			}
		}

		// Methode 2: io() als Funktion
		if (!sock && typeof ioManager === 'function') {
			console.log('[WEM] Nutze io() als Funktion');
			try {
				sock = ioManager(window.location.origin, {
					path: '/socket.io',
				});
			} catch (e: any) {
				console.warn('[WEM] io() Fehler:', e.message);
			}
		}

		// Methode 3: io.io()
		if (!sock && ioManager && typeof ioManager.io === 'function') {
			console.log('[WEM] Nutze io.io()');
			try {
				sock = ioManager.io(window.location.origin, {
					path: '/socket.io',
				});
			} catch (e: any) {
				console.warn('[WEM] io.io() Fehler:', e.message);
			}
		}

		// Methode 4: new io.Manager()
		if (!sock && ioManager && ioManager.Manager) {
			console.log('[WEM] Nutze new io.Manager()');
			try {
				const manager = new ioManager.Manager(window.location.origin, { path: '/socket.io' });
				sock = manager.socket('/');
			} catch (e: any) {
				console.warn('[WEM] Manager Fehler:', e.message);
			}
		}

		if (!sock) {
			console.error('[WEM] Kein Socket erstellt!');
			console.log('[WEM] io Keys:', Object.keys(ioManager || {}));
			return;
		}

		//	_socketInstance = sock;
		console.log('[WEM] Socket erstellt:', typeof sock);

		sock.on('connect', () => {
			console.log('[WEM] ✅ Verbunden! ID:', sock.id);
			callback(sock);
		});

		sock.on('disconnect', (reason: string) => {
			console.warn('[WEM] Getrennt:', reason);
		});

		sock.on('connect_error', (e: any) => {
			console.error('[WEM] Verbindungsfehler:', e.message);
		});

		// Falls bereits verbunden
		if (sock.connected) {
			console.log('[WEM] Bereits verbunden');
			callback(sock);
		}

		console.log('[WEM] io Keys:', Object.keys(ioManager || {}));
	};

	script.onerror = () => {
		console.error('[WEM] socket.io Script nicht ladbar');
	};

	document.head.appendChild(script);
}

export function getObject(socket: any, id: string): Promise<any> {
	return new Promise((resolve, reject) => {
		socket.emit('getObject', id, (err: any, obj: any) => {
			if (err) {
				reject(new Error(String(err)));
			} else {
				resolve(obj);
			}
		});
	});
}

export function setObject(socket: any, id: string, obj: any): Promise<void> {
	return new Promise((resolve, reject) => {
		socket.emit('setObject', id, obj, (err: any) => {
			if (err) {
				reject(new Error(String(err)));
			} else {
				resolve();
			}
		});
	});
}

export function extendObject(socket: any, id: string, obj: any): Promise<void> {
	return new Promise((resolve, reject) => {
		socket.emit('extendObject', id, obj, (err: any) => {
			if (err) {
				reject(new Error(String(err)));
			} else {
				resolve();
			}
		});
	});
}
// export function testCon(socket:any,id:string,native : Record<string, any>):Promise<void>{
//     return new Promise(
//         (resolve, reject) => {

// socket.emit('sendTo',
//             `wem-canapi.${id}`,
//             'testConnection',
//             {
//                 host:     native.host,
//                 port:     native.port     || 80,
//                 username: native.username || '',
//                 password: native.password || '',
//             },
//             (err: any) => {
//                 if (err) reject(new Error(String(err)));
//             else resolve();
//                 /* setStatus(res?.result
//                     ? '✅ Verbindung erfolgreich!'
//                     : `❌ ${res?.error || 'Fehler'}`
//                 );
//                 setTesting(false);
//                 console.log('Verbindundstest Result:',res); */
//             }

//         );

//  } )
// }
export function testCon(socket: any, id: string, native: Record<string, any>): Promise<any> {
	return new Promise((resolve, reject) => {
		const targetInstance = `${id}`;
		const data = {
			host: native.host,
			port: native.port || 80,
			username: native.username || '',
			password: native.password || '',
		};

		console.log('Target:', targetInstance);
		console.log('Data:', data);

		// Versuch 1: Connection Objekt (ioBroker v5)
		if (socket && typeof socket.sendTo === 'function') {
			console.log('✅ Using socket.sendTo()');
			socket.sendTo(targetInstance, 'testConnection', data).then(resolve).catch(reject);
		} else if (socket?._socket && typeof socket._socket.emit === 'function') {
			console.log('✅ Using socket._socket.emit()');
			socket._socket.emit('sendTo', targetInstance, 'testConnection', data, (result: any) => {
				result?.error ? reject(new Error(result.error)) : resolve(result);
			});
		} else if (socket && typeof socket.emit === 'function') {
			console.log('✅ Using socket.emit()');
			socket.emit('sendTo', targetInstance, 'testConnection', data, (result: any) => {
				console.log(result);
				result?.error ? reject(new Error(result.error)) : resolve(result);
			});
		} else if (socket?.socket && typeof socket.socket.emit === 'function') {
			console.log('✅ Using socket.socket.emit()');
			socket.socket.emit('sendTo', targetInstance, 'testConnection', data, (result: any) => {
				result?.error ? reject(new Error(result.error)) : resolve(result);
			});
		} else {
			console.error('❌ No valid socket method found!');
			console.log('Socket:', socket);
			reject(new Error('Socket hat keine sendTo/emit Methode'));
		}
	});
}
