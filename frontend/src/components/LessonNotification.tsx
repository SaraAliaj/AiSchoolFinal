import React, { useEffect, useState } from 'react';
import './LessonNotification.css';

interface NotificationProps {
    message: string;
    onClose: () => void;
}

const LessonNotification: React.FC<NotificationProps> = ({ message, onClose }) => {
    useEffect(() => {
        // Auto-close notification after 5 seconds
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="lesson-notification">
            <div className="notification-content">
                <span className="notification-message">{message}</span>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
        </div>
    );
};

export default LessonNotification; 