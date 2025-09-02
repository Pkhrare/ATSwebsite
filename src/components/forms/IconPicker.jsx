import React, { useMemo, useState, useRef, useEffect } from "react";
import * as HeroIcons from "@heroicons/react/24/outline";
import './IconPicker.css';

export const useIconPicker = () => {
  const icons = useMemo(
    () =>
      Object.entries(HeroIcons).map(([iconName, IconComponent]) => ({
        name: iconName,
        friendlyName: iconName.replace(/([A-Z])/g, ' $1').trim(),
        Component: IconComponent,
      })),
    []
  );

  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    return icons.filter((icon) =>
      icon.friendlyName.toLowerCase().includes(search.toLowerCase())
    );
  }, [icons, search]);

  return { search, setSearch, icons: filteredIcons };
};

export const IconRenderer = ({ icon, ...rest }) => {
  const IconComponent = HeroIcons[icon];
  if (!IconComponent) return null;
  return <IconComponent {...rest} />;
};

const IconPicker = ({ selectedIcon, onIconChange, disabled }) => {
    const { search, setSearch, icons } = useIconPicker();
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelect = (iconName) => {
        onIconChange(iconName);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={pickerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="w-full mt-1 px-3 py-2 text-black border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
            >
                {selectedIcon ? <IconRenderer icon={selectedIcon} className="w-6 h-6" /> : 'Select an Icon'}
            </button>

            {isOpen && (
                <div className="absolute z-20 mt-2 w-72 bg-white border border-slate-300 rounded-lg shadow-lg">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Search icons..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full p-2 border text-black border-slate-300 rounded-md"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto grid grid-cols-5 gap-2 p-2 icon-picker-list">
                        {icons.map((icon) => (
                            <button
                                key={icon.name}
                                type="button"
                                onClick={() => handleSelect(icon.name)}
                                className="p-2 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transform transition-transform hover:scale-110"
                                title={icon.friendlyName}
                            >
                                <icon.Component className="w-6 h-6" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IconPicker;
