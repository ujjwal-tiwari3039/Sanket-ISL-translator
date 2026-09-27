import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Workspace from './Workspace.jsx';
import './index.css';
createRoot(document.getElementById('root')).render(<StrictMode><Workspace/></StrictMode>);
