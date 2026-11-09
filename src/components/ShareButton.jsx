import React, { useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import {
    ShareStatus,
    shareButtonIcon,
    shareButtonLabel,
    shareStatusAnnouncement,
} from '../modes';

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
    const [status, setStatus] = useState(ShareStatus.IDLE);
    const timer = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    const handleClick = async () => {
        clearTimeout(timer.current);
        try {
            await copyText(window.location.href);
            setStatus(ShareStatus.COPIED);
            ReactGA.event({ category: 'Share', action: 'Copy Link' });
        } catch {
            setStatus(ShareStatus.FAILED);
        }
        timer.current = setTimeout(() => setStatus(ShareStatus.IDLE), 2500);
    };

    return (
        <>
            <button type="button" className="iw-share-btn" data-state={status} onClick={handleClick}>
                <span aria-hidden="true">{shareButtonIcon(status)} </span>
                {shareButtonLabel(status)}
            </button>
            <span className="iw-visually-hidden" role="status">
                {shareStatusAnnouncement(status)}
            </span>
        </>
    );
};

export default ShareButton;
