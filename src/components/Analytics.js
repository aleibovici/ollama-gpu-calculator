import { useEffect } from 'react';
import ReactGA from 'react-ga4';

const Analytics = () => {
    useEffect(() => {
        const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
        if (!measurementId) {
            console.warn('Google Analytics Measurement ID is not defined');
            return;
        }
        
        ReactGA.initialize(measurementId);
        ReactGA.send('pageview');
    }, []);

    return null;
};

export default Analytics; 
