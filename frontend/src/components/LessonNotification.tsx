import React, { useEffect, useState } from 'react';
import './LessonNotification.css';
import { CheckCircle, XCircle } from 'lucide-react';

interface NotificationProps {
    message: string;
    onClose: () => void;
    type?: 'start' | 'end' | 'info';
}

const LessonNotification: React.FC<NotificationProps> = ({ message, onClose, type = 'info' }) => {
    useEffect(() => {
        // Auto-close notification after 5 seconds
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    // Determine if this is a lesson started or ended notification
    const isLessonStart = type === 'start' || message.includes('started');
    const isLessonEnd = type === 'end' || message.includes('ended');

    // Choose the appropriate class based on notification type
    const notificationClass = isLessonStart 
        ? 'lesson-notification-start' 
        : isLessonEnd 
            ? 'lesson-notification-end'
            : 'lesson-notification';

    return (
        <div className={notificationClass}>
            <div className="notification-content">
                {isLessonStart && (
                    <CheckCircle className="notification-icon notification-icon-start" />
                )}
                {isLessonEnd && (
                    <XCircle className="notification-icon notification-icon-end" />
                )}
                <span className="notification-message">{message}</span>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
        </div>
    );
};

export default LessonNotification; 