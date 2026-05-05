import React, { useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { potService } from '../../services/potService';

const NotificationMonitor = () => {
    useEffect(() => {
        const checkAnomalies = async () => {
            try {
                // Fetch latest data for all pots (Daily)
                const latestData = await potService.getDailyLatest();
                if (!latestData || !latestData.rows) return;

                // Fetch UNREAD notifications to avoid spamming the same active issue
                const unreadNotifications = await notificationService.getUnread();
                const unreadTitles = new Set(unreadNotifications.map(n => n.title));

                latestData.rows.forEach(pot => {
                    // SKIP IF POT IS OFFLINE (CE is 0 or low)
                    if (!pot.ce || pot.ce < 1) return;

                    // Check Noise
                    // Ensure noise is valid and not 0 (unless 0 is valid, but usually >50 is the trigger)
                    if (pot.noise && pot.noise > 50) {
                        const title = `High Noise: Pot ${pot.pot_id}`;

                        // Only create if we don't already have an UNREAD notification for this.
                        if (!unreadTitles.has(title)) {
                            notificationService.create(
                                'warning',
                                title,
                                `Noise level ${pot.noise.toFixed(0)} mV exceeds threshold (>50)`
                            );
                            unreadTitles.add(title);
                        }
                    }

                    // Check Voltage
                    // Ignore 0 or very low values which likely mean offline/no data
                    if (pot.avv && pot.avv > 0.1 && pot.avv < 4.0) {
                        const title = `Low Voltage: Pot ${pot.pot_id}`;
                        if (!unreadTitles.has(title)) {
                            notificationService.create(
                                'error',
                                title,
                                `Voltage level ${pot.avv.toFixed(2)} V is critical (<4.0)`
                            );
                            unreadTitles.add(title);
                        }
                    }
                });

            } catch (error) {
                console.error("Error monitoring anomalies:", error);
            }
        };

        // Run immediately
        checkAnomalies();

        // Poll every 5 minutes (300,000 ms) to match data update cycle
        // Using 5000ms (5s) for dev testing? No, stick to 5 mins or maybe 1 min to be safe.
        // User said "every new data update" (5 mins).
        // Let's stick to 60s to catch it slightly faster than 5m, or just match 5m.
        // If data updates at 12:00, 12:05... polling at 12:01 works.
        const interval = setInterval(checkAnomalies, 300000);
        return () => clearInterval(interval);
    }, []);

    return null; // This component renders nothing
};

export default NotificationMonitor;
