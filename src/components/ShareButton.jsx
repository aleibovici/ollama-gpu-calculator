import React, { useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga4';

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    // Older browsers / non-secure contexts.
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand?.('copy');
    document.body.removeChild(el);
    if (!ok) throw new Error('copy failed');
}

/** Copies the current page URL, which always reflects the calculator inputs. */
const ShareButton = () => {
    const [status, setStatus] = useState('idle'); // idle | copied | failed
    const timer = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    const handleClick = async () => {
        clearTimeout(timer.current);
        try {
            await copyText(window.location.href);
            setStatus('copied');
            ReactGA.event({ category: 'Share', action: 'Copy Link' });
        } catch {
            setStatus('failed');
        }
        timer.current = setTimeout(() => setStatus('idle'), 2500);
    };

    const icon = status === 'copied' ? '✓' : '⧉';
    const label = status === 'copied' ? 'Link copied' : status === 'failed' ? 'Copy from address bar' : 'Copy link';

    return (
        <>
            <button type="button" className="iw-share-btn" data-state={status} onClick={handleClick}>
                <span aria-hidden="true">{icon} </span>
                {label}
            </button>
            <span className="iw-visually-hidden" role="status">
                {status === 'copied' ? 'Link to this configuration copied' : ''}
                {status === 'failed' ? 'Could not copy. Copy the link from the address bar.' : ''}
            </span>
        </>
    );
};

export default ShareButton;
