import { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);

    if (!message) return null;

    return <div className="toast">{message}</div>;
    }
