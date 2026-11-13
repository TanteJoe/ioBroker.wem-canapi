import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const style = document.createElement('style');
style.textContent = `
    *,*::before,*::after{box-sizing:border-box;}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#333;background:#fafafa;}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
`;
document.head.appendChild(style);

const el = document.getElementById('root');
if (el) {
	ReactDOM.createRoot(el).render(<App />);
}
