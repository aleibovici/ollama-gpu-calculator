import { useEffect } from 'react';
import ReactGA from 'react-ga4';

// Must match the gtag config in index.html (ships to GitHub Pages via dist/).
const GA_MEASUREMENT_ID = 'G-CC58E7MH89';

const Analytics = () => {
    useEffect(() => {
        // index.html already sends the initial page_view via gtag('config').
        // Initialize react-ga4 once so custom events in the calculator work.
        ReactGA.initialize(GA_MEASUREMENT_ID, {
            gtagOptions: {
                send_page_view: false,
            },
        });
    }, []);

    return null;
};

export default Analytics;
