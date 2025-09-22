import React, { useState, useEffect, useCallback } from 'react';
import ApiCaller from './apiCall/ApiCaller';

const CalendarAvailability = ({ onTimeSlotSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [allAvailableSlots, setAllAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [userTimeZone, setUserTimeZone] = useState('');

    // Define the specific time slots in America/New_York timezone
    const PREDEFINED_SLOTS_NY = [
        { hour: 10, minute: 0 },  // 10:00 - 10:30
        { hour: 11, minute: 5 },  // 11:05 - 11:35
        { hour: 12, minute: 10 }, // 12:10 - 12:40
        { hour: 13, minute: 15 }, // 1:15 - 1:45
        { hour: 14, minute: 20 }, // 2:20 - 2:50
        { hour: 15, minute: 25 }, // 3:25 - 3:55
        { hour: 16, minute: 30 }, // 4:30 - 5:00
    ];

    // Get the user's timezone on component mount
    useEffect(() => {
        try {
            // Get the user's timezone using Intl API
            const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setUserTimeZone(userTz);
        } catch (error) {
            console.error('Error detecting user timezone:', error);
            // Default to America/New_York if we can't detect
            setUserTimeZone('America/New_York');
        }
    }, []);

    useEffect(() => {
        const fetchBusySlots = async () => {
            setLoading(true);
            const today = new Date();
            const startDate = new Date(today);
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 30); // Fetch a month of availability

            try {
                const startISO = startDate.toISOString();
                const endISO = endDate.toISOString();
                
                let busySlots = [];
                
                try {
                    // Try to get busy slots from API - note that the API returns BUSY times, not available times
                    busySlots = await ApiCaller(`/calendar/available-slots?start=${startISO}&end=${endISO}`);
                    console.log('Busy slots from API:', busySlots);
                } catch (apiError) {
                    console.error('API error, falling back to mock data:', apiError);
                    
                    // Generate mock busy slots for testing
                    const mockBusySlots = [];
                    
                    // Create mock data for the next 30 days
                    for (let i = 1; i <= 30; i++) {
                        const currentDate = new Date(today);
                        currentDate.setDate(today.getDate() + i);
                        
                        // Skip weekends (no need to create busy slots for weekends)
                        const dayOfWeek = currentDate.getDay();
                        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
                        
                        // Create different busy patterns based on the day
                        
                        // For Monday, Wednesday, Friday: busy during lunch (12-2pm) and after 5pm
                        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
                            // Lunch break
                            const lunchStart = new Date(currentDate);
                            lunchStart.setHours(12, 0, 0, 0);
                            const lunchEnd = new Date(currentDate);
                            lunchEnd.setHours(14, 0, 0, 0);
                            
                            mockBusySlots.push({
                                start: lunchStart.toISOString(),
                                end: lunchEnd.toISOString()
                            });
                            
                            // Also make 11:05 slot busy on Mondays (for testing)
                            if (dayOfWeek === 1) {
                                const morningBusyStart = new Date(currentDate);
                                morningBusyStart.setHours(11, 5, 0, 0);
                                const morningBusyEnd = new Date(currentDate);
                                morningBusyEnd.setHours(11, 35, 0, 0);
                                
                                mockBusySlots.push({
                                    start: morningBusyStart.toISOString(),
                                    end: morningBusyEnd.toISOString()
                                });
                            }
                        }
                        // For Tuesday, Thursday: busy in the morning (before 10am) and afternoon (3pm-5pm)
                        else if (dayOfWeek === 2 || dayOfWeek === 4) {
                            const afternoonBusyStart = new Date(currentDate);
                            afternoonBusyStart.setHours(15, 0, 0, 0);
                            const afternoonBusyEnd = new Date(currentDate);
                            afternoonBusyEnd.setHours(17, 0, 0, 0);
                            
                            mockBusySlots.push({
                                start: afternoonBusyStart.toISOString(),
                                end: afternoonBusyEnd.toISOString()
                            });
                        }
                    }
                    
                    busySlots = mockBusySlots;
                }
                
                // Store busy slots
                setAllAvailableSlots(Array.isArray(busySlots) ? busySlots.map(s => ({ start: new Date(s.start), end: new Date(s.end) })) : []);
            } catch (error) {
                console.error('Error fetching busy slots:', error);
                setAllAvailableSlots([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBusySlots();
    }, []);
    
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };
    
    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };
    
    const getPreviousMonth = () => {
        const date = new Date(currentMonth);
        date.setMonth(date.getMonth() - 1);
        setCurrentMonth(date);
    };
    
    const getNextMonth = () => {
        const date = new Date(currentMonth);
        date.setMonth(date.getMonth() + 1);
        setCurrentMonth(date);
    };

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        onTimeSlotSelect(null);
    };

    const handleSlotClick = (slot) => {
        setSelectedSlot(slot.toISOString());
        onTimeSlotSelect(slot);
    };

    // Check if a date is in the past or a weekend
    const isInvalidDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if date is in the past
        if (date < today) return true;
        
        // Check if date is a weekend (0 = Sunday, 6 = Saturday)
        const day = date.getDay();
        if (day === 0 || day === 6) return true;
        
        return false;
    };

    const getAllSlotsForDate = useCallback((date) => {
        if (!date || isInvalidDate(date)) return [];

        const allSlots = [];

        PREDEFINED_SLOTS_NY.forEach(slotTime => {
            // Create a date object for the selected date
            const slotDate = new Date(date);
            
            // Create a date string in NY timezone format (YYYY-MM-DDThh:mm:ss)
            // First set the date to the selected date
            const nyDateString = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, '0')}-${String(slotDate.getDate()).padStart(2, '0')}`;
            
            // Then add the time from our predefined slots
            const nyTimeString = `${String(slotTime.hour).padStart(2, '0')}:${String(slotTime.minute).padStart(2, '0')}:00`;
            
            // Combine them and specify Eastern Time
            const nyDateTimeString = `${nyDateString}T${nyTimeString}-04:00`; // -04:00 is EDT
            
            // Create a date object that represents the NY time
            const slotStartNY = new Date(nyDateTimeString);
            const slotEndNY = new Date(slotStartNY.getTime() + 30 * 60 * 1000);
            
            // Check if this predefined slot overlaps with any of the busy slots from the API
            const isBusy = allAvailableSlots.some(busySlot => {
                const busyStart = busySlot.start;
                const busyEnd = busySlot.end;
                
                // Check for overlap - if any part of the slot overlaps with a busy period, it's not available
                const hasOverlap = (
                    (slotStartNY <= busyEnd && slotEndNY >= busyStart) || // Slot overlaps with busy period
                    (busyStart <= slotEndNY && busyEnd >= slotStartNY)    // Busy period overlaps with slot
                );
                
                return hasOverlap;
            });
            
            // Add all slots, but mark their availability status (available if NOT busy)
            if (!isInvalidDate(slotStartNY)) {
                allSlots.push({
                    time: slotStartNY,
                    isAvailable: !isBusy
                });
            }
        });

        return allSlots;
    }, [allAvailableSlots]);
    
    // Format the time with timezone indicator
    const formatTimeWithZone = (dateTime) => {
        const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true
        };
        
        // Get the timezone abbreviation
        const tzAbbr = new Intl.DateTimeFormat('en', { 
            timeZoneName: 'short'
        }).formatToParts(dateTime)
        .find(part => part.type === 'timeZoneName')?.value || '';
        
        return `${dateTime.toLocaleTimeString([], options)} ${tzAbbr}`;
    };
    
    // Generate calendar days
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfMonth = getFirstDayOfMonth(year, month);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Add day names header
        dayNames.forEach(day => {
            days.push(
                <div key={`header-${day}`} className="text-center py-2 font-semibold text-sm text-gray-300">
                    {day}
                </div>
            );
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="p-2"></div>);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const isInvalid = isInvalidDate(date);
            
            days.push(
                <div key={`day-${day}`} className="p-1">
                    <button
                        type="button"
                        onClick={() => !isInvalid && handleDateSelect(date)}
                        disabled={isInvalid}
                        className={`w-full h-10 rounded-md flex items-center justify-center text-sm font-medium
                            ${isSelected
                                ? 'bg-yellow-500 text-gray-900'
                                : isToday
                                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                                    : isInvalid
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                            }`}
                    >
                        {day}
                    </button>
                </div>
            );
        }
        
        return days;
    };
    
    const timeSlotsForSelectedDate = selectedDate ? getAllSlotsForDate(selectedDate) : [];

    return (
        <div className="space-y-6 bg-gray-800 p-4 rounded-lg">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
                <button 
                    type="button" 
                    onClick={getPreviousMonth}
                    className="p-2 rounded-md bg-gray-700 text-white hover:bg-gray-600"
                >
                    &lt;
                </button>
                <h3 className="text-xl font-semibold text-white">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button 
                    type="button" 
                    onClick={getNextMonth}
                    className="p-2 rounded-md bg-gray-700 text-white hover:bg-gray-600"
                >
                    &gt;
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
            </div>

            {/* Time Slots Section */}
            {loading && <p className="text-gray-400 text-center py-4">Loading available times...</p>}

            {!loading && selectedDate && (
                <div className="mt-6">
                    <h4 className="text-lg font-semibold text-white mb-2">
                        Available Times for {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h4>
                    <p className="text-sm text-gray-400 mb-3">
                        Times shown in your local timezone ({userTimeZone.replace('_', ' ')})
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {timeSlotsForSelectedDate.length > 0 ? (
                            timeSlotsForSelectedDate.map((slot) => (
                                <button
                                    key={slot.time.toISOString()}
                                    type="button"
                                    onClick={() => slot.isAvailable && handleSlotClick(slot.time)}
                                    disabled={!slot.isAvailable}
                                    className={`px-3 py-3 border rounded-md text-sm font-medium
                                        ${selectedSlot === slot.time.toISOString()
                                            ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                                            : slot.isAvailable 
                                                ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600'
                                                : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{formatTimeWithZone(slot.time)}</span>
                                        {!slot.isAvailable && 
                                            <span className="ml-2 text-xs bg-red-800 text-white px-1 rounded">Booked</span>
                                        }
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="text-gray-400 col-span-full text-center py-4">
                                No available slots for this date.
                            </p>
                        )}
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-4 text-center">
                        All appointments are scheduled for 30 minutes
                    </p>
                </div>
            )}
            
        </div>
    );
};

export default CalendarAvailability;
