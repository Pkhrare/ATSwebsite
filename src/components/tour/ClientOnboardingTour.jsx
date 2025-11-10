import React, { useState, useEffect, useCallback } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { getClientTourSteps } from '../../utils/clientTourConfig';

const ClientOnboardingTour = ({
    isRunning,
    onComplete,
    onSkip,
    hasGetStartedTask = false,
    hasOnboardingTasks = false,
    currentStepIndex = 0,
    onStepChange,
}) => {
    const [stepIndex, setStepIndex] = useState(currentStepIndex);
    const [run, setRun] = useState(isRunning);

    useEffect(() => {
        setRun(isRunning);
    }, [isRunning]);

    useEffect(() => {
        setStepIndex(currentStepIndex);
    }, [currentStepIndex]);

    const steps = React.useMemo(() => {
        try {
            return getClientTourSteps(hasGetStartedTask, hasOnboardingTasks);
        } catch (error) {
            console.error('Error generating tour steps:', error);
            return [];
        }
    }, [hasGetStartedTask, hasOnboardingTasks]);

    const handleJoyrideCallback = useCallback((data) => {
        const { status, type, index, action } = data;

        // Update step index when step changes
        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
            setStepIndex(nextIndex);
            if (onStepChange) {
                onStepChange(nextIndex);
            }
        }

        // Handle tour completion
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);
            if (status === STATUS.FINISHED) {
                onComplete();
            } else if (status === STATUS.SKIPPED) {
                onSkip();
            }
        }
    }, [onComplete, onSkip, onStepChange]);

    // Custom styles to match your color scheme
    const joyrideStyles = {
        options: {
            primaryColor: '#2563eb', // blue-600
            textColor: '#1e293b', // slate-800
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            beaconSize: 36,
            zIndex: 10000,
        },
        tooltip: {
            borderRadius: 8,
        },
        tooltipContainer: {
            textAlign: 'left',
        },
        buttonNext: {
            backgroundColor: '#2563eb',
            fontSize: '14px',
            fontWeight: '600',
            padding: '10px 20px',
            borderRadius: '6px',
        },
        buttonBack: {
            color: '#64748b',
            fontSize: '14px',
            marginRight: '10px',
        },
        buttonSkip: {
            color: '#64748b',
            fontSize: '14px',
        },
        beacon: {
            inner: {
                backgroundColor: '#2563eb',
            },
            outer: {
                borderColor: '#2563eb',
            },
        },
    };

    // Custom button text
    const locale = {
        back: 'Previous',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open the dialog',
        skip: 'Skip Tour', // This will skip the entire tour
    };

    // Don't render if no steps
    if (!steps || steps.length === 0) {
        return null;
    }

    return (
        <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={joyrideStyles}
            locale={locale}
            disableOverlayClose
            disableCloseOnEsc={false}
            hideCloseButton={false}
            spotlightClicks={false}
            floaterProps={{
                disableAnimation: false,
            }}
        />
    );
};

export default ClientOnboardingTour;

